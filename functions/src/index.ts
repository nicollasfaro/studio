
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {google} from "googleapis";
import {Change, EventContext} from "firebase-functions";
import {DocumentSnapshot} from "firebase-functions/v1/firestore";
import {MessagingPayload, MulticastMessage} from "firebase-admin/messaging";


// Inicializa o Firebase Admin SDK.
admin.initializeApp();
const db = admin.firestore();

/**
 * Envia notificação push para usuários sobre novas promoções.
 */
export const sendPromotionNotification = functions.firestore
  .document("promotions/{promotionId}")
  .onCreate(async (snapshot: DocumentSnapshot, context: EventContext) => {
    if (!snapshot) {
      console.log("Nenhum dado no evento, encerrando a função.");
      return;
    }
    const promotionData = snapshot.data();
    if (!promotionData) {
      console.log("Dados da promoção não encontrados.");
      return;
    }
    const {name, description} = promotionData;
    console.log(`Nova promoção: "${name}". Enviando notificações.`);

    const usersWithTokensSnapshot = await db.collection("users")
      .where("fcmTokens", "!=", null)
      .where("fcmTokens", "!=", [])
      .get();

    if (usersWithTokensSnapshot.empty) {
      console.log("Nenhum usuário com tokens de notificação encontrados.");
      return;
    }

    const tokens = usersWithTokensSnapshot.docs.flatMap((doc) => doc.data().fcmTokens || []);

    if (tokens.length === 0) {
      console.log("Nenhum token válido encontrado para enviar notificações.");
      return;
    }

    console.log(`Encontrados ${tokens.length} tokens para notificar.`);
    const payload: MessagingPayload = {
      notification: {
        title: `🎉 Nova Promoção: ${name}!`,
        body: description,
        icon: "/icons/icon-192x192.png",
        click_action: "/promotions",
      },
    };

    const message: MulticastMessage = {
      tokens,
      notification: payload.notification,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log("Notificações enviadas com sucesso:", response.successCount);
      if (response.failureCount > 0) {
        console.log("Falhas ao enviar notificações:", response.failureCount);
        const tokensToRemove: Promise<any>[] = [];
        response.responses.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error("Falha ao enviar para o token:", tokens[index], error);
            if (error.code === "messaging/invalid-registration-token" ||
                error.code === "messaging/registration-token-not-registered") {
              // Lógica para remover token inválido do usuário
            }
          }
        });
        await Promise.all(tokensToRemove);
      }
    } catch (error) {
      console.error("Erro ao enviar notificações:", error);
    }
  });

/**
 * Envia uma notificação por WhatsApp quando um agendamento é criado ou cancelado.
 */
export const sendAppointmentStatusNotification = functions.firestore
    .document("appointments/{appointmentId}")
    .onUpdate(async (change: Change<DocumentSnapshot>, context: EventContext) => {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      if (!afterData) return;

      const isNew = !change.before.exists && afterData.status === "Marcado";
      const isCancelled = beforeData?.status !== "cancelado" && afterData.status === "cancelado";

      if (!isNew && !isCancelled) {
        return;
      }

      const configDoc = await db.collection("config").doc("notifications").get();
      const adminPhoneNumber = configDoc.data()?.notificationWhatsapp;

      if (!adminPhoneNumber) {
        console.log("Número de WhatsApp do admin não configurado.");
        return;
      }

      let messageBody = "";
      if (isNew) {
        messageBody = `🔔 *Novo Agendamento!*
Cliente: ${afterData.clientName}
Serviço: (Buscando...)
Data: ${new Date(afterData.startTime).toLocaleString("pt-BR")}
Status: ${afterData.status}`;
      } else if (isCancelled) {
        messageBody = `❌ *Agendamento Cancelado!*
Cliente: ${afterData.clientName}
Serviço: (Buscando...)
Data: ${new Date(afterData.startTime).toLocaleString("pt-BR")}`;
      }

      const serviceDoc = await db.collection("services").doc(afterData.serviceId).get();
      const serviceName = serviceDoc.data()?.name || "Desconhecido";
      messageBody = messageBody.replace("(Buscando...)", serviceName);

      const whatsappPayload = {
        to: adminPhoneNumber,
        body: messageBody,
      };

      console.log("Simulação: Mensagem de WhatsApp enviada com sucesso.", whatsappPayload);
    });

/**
 * Cria um evento na Agenda Google do usuário ao criar um novo agendamento.
 */
export const createGoogleCalendarEvent = functions.firestore
  .document("appointments/{appointmentId}")
  .onCreate(async (snapshot: DocumentSnapshot, context: EventContext) => {
    if (!snapshot) {
      console.log("Nenhum dado de agendamento encontrado.");
      return;
    }
    const appointmentData = snapshot.data();
    if (!appointmentData) {
      console.log("Dados do agendamento não encontrados.");
      return;
    }

    const {clientId, serviceId, startTime, endTime} = appointmentData;

    const userDoc = await db.collection("users").doc(clientId).get();
    const userData = userDoc.data();

    if (userData?.providerId !== "google.com" || !userData.googleAccessToken) {
      console.log(`Usuário ${clientId} não está logado com Google ou não tem token.`);
      return;
    }

    const serviceDoc = await db.collection("services").doc(serviceId).get();
    const serviceName = serviceDoc.data()?.name || "Agendamento";

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({access_token: userData.googleAccessToken});

    const calendar = google.calendar({version: "v3", auth: oauth2Client});

    const eventDetails = {
      summary: `${serviceName} na Thainnes Cuba Ciuldin`,
      description: "Seu agendamento de beleza.",
      start: {
        dateTime: startTime,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endTime,
        timeZone: "America/Sao_Paulo",
      },
      attendees: [{email: userData.email}],
      reminders: {
        useDefault: false,
        overrides: [
          {method: "email", "minutes": 24 * 60},
          {method: "popup", "minutes": 60},
        ],
      },
    };

    try {
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventDetails,
      });
      console.log(`Evento criado com sucesso na agenda do usuário ${clientId}.`);
    } catch (error) {
      console.error("Erro ao criar evento na Agenda Google:", error);
    }
  });

/**
 * Envia uma notificação para o cliente quando seu agendamento é confirmado.
 */
export const sendAppointmentConfirmationNotification = functions.firestore
  .document("appointments/{appointmentId}")
  .onUpdate(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData || beforeData.status === "confirmado" || afterData.status !== "confirmado") {
      return;
    }

    const {clientId, serviceId, startTime} = afterData;

    const userDoc = await db.collection("users").doc(clientId).get();
    const userData = userDoc.data();
    const tokens = userData?.fcmTokens;

    if (!tokens || tokens.length === 0) {
      console.log(`Cliente ${clientId} não possui tokens FCM para notificar.`);
      return;
    }

    const serviceDoc = await db.collection("services").doc(serviceId).get();
    const serviceName = serviceDoc.data()?.name || "Seu serviço";
    const formattedDate = new Date(startTime).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const payload: MessagingPayload = {
      notification: {
        title: "✅ Agendamento Confirmado!",
        body: `${serviceName} em ${formattedDate} foi confirmado. Mal podemos esperar para te ver!`,
        icon: "/icons/icon-192x192.png",
        click_action: "/profile",
      },
    };

    const message: MulticastMessage = {
        tokens,
        notification: payload.notification,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Notificação de confirmação enviada para ${clientId}:`, response.successCount);
    } catch (error) {
      console.error("Erro ao enviar notificação de confirmação:", error);
    }
  });
