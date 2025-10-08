
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {google} from "googleapis";

// Inicializa o Firebase Admin SDK.
admin.initializeApp();
const db = admin.firestore();

/**
 * Envia notificação push para usuários sobre novas promoções.
 */
export const sendPromotionNotification = onDocumentCreated(
  "promotions/{promotionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("Nenhum dado no evento, encerrando a função.");
      return;
    }
    const promotionData = snapshot.data();
    const {name, description} = promotionData;
    console.log(`Nova promoção: "${name}". Enviando notificações.`);

    // 1. Otimiza a consulta para buscar apenas usuários com tokens
    const usersWithTokensSnapshot = await db.collection("users")
      .where("fcmTokens", "!=", null)
      .where("fcmTokens", "!=", [])
      .get();

    if (usersWithTokensSnapshot.empty) {
      console.log("Nenhum usuário com tokens de notificação encontrados.");
      return;
    }

    // 2. Coleta todos os tokens de forma segura e eficiente
    const tokens = usersWithTokensSnapshot.docs.flatMap((doc) => doc.data().fcmTokens || []);

    if (tokens.length === 0) {
      console.log("Nenhum token válido encontrado para enviar notificações.");
      return;
    }

    console.log(`Encontrados ${tokens.length} tokens para notificar.`);
    const payload = {
      notification: {
        title: `🎉 Nova Promoção: ${name}!`,
        body: description,
        icon: "/icons/icon-192x192.png",
        click_action: "/promotions",
      },
    };
    try {
      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log("Notificações enviadas com sucesso:", response.successCount);
      if (response.failureCount > 0) {
        console.log("Falhas ao enviar notificações:", response.failureCount);
        // Opcional: Lógica para limpar tokens inválidos
        const tokensToRemove: Promise<any>[] = [];
        response.results.forEach((result, index) => {
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
  },
);

/**
 * Envia uma notificação por WhatsApp quando um agendamento é criado ou cancelado.
 */
export const sendAppointmentStatusNotification = onDocumentUpdated(
    "appointments/{appointmentId}",
    async (event) => {
      if (!event.data) {
        return;
      }
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      // Verifica se é uma criação (sem dados antes) ou se o status mudou para 'cancelado'
      const isNew = !event.data.before.exists && afterData.status === "Marcado";
      const isCancelled = beforeData.status !== "cancelado" && afterData.status === "cancelado";

      if (!isNew && !isCancelled) {
        return;
      }

      // Busca o número de WhatsApp do admin
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

      // Busca o nome do serviço
      const serviceDoc = await db.collection("services").doc(afterData.serviceId).get();
      const serviceName = serviceDoc.data()?.name || "Desconhecido";
      messageBody = messageBody.replace("(Buscando...)", serviceName);

      // Simulação do envio de WhatsApp
      const whatsappPayload = {
        to: adminPhoneNumber,
        body: messageBody,
      };

      console.log("Simulação: Mensagem de WhatsApp enviada com sucesso.", whatsappPayload);

      // AQUI você adicionaria a chamada real para a API do WhatsApp (ex: Twilio)
      // Exemplo com Twilio (requer configuração do SDK 'twilio'):
      /*
      import twilio from "twilio";
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      try {
        await client.messages.create({
          from: 'whatsapp:+<SEU_NUMERO_TWILIO>',
          to: `whatsapp:${adminPhoneNumber}`,
          body: messageBody,
        });
        console.log("Mensagem de WhatsApp enviada com sucesso.");
      } catch (error) {
        console.error("Erro ao enviar WhatsApp:", error);
      }
      */
    },
);

/**
 * Cria um evento na Agenda Google do usuário ao criar um novo agendamento.
 */
export const createGoogleCalendarEvent = onDocumentCreated(
  "appointments/{appointmentId}",
  async (event) => {
    const appointmentData = event.data?.data();
    if (!appointmentData) {
      console.log("Nenhum dado de agendamento encontrado.");
      return;
    }

    const {clientId, serviceId, startTime, endTime} = appointmentData;

    // 1. Buscar os dados do usuário para obter o token de acesso.
    const userDoc = await db.collection("users").doc(clientId).get();
    const userData = userDoc.data();

    if (userData?.providerId !== "google.com" || !userData.googleAccessToken) {
      console.log(`Usuário ${clientId} não está logado com Google ou não tem token.`);
      return;
    }

    // 2. Buscar o nome do serviço.
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    const serviceName = serviceDoc.data()?.name || "Agendamento";

    // 3. Configurar o cliente OAuth2 com o token do usuário.
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({access_token: userData.googleAccessToken});

    const calendar = google.calendar({version: "v3", auth: oauth2Client});

    // 4. Montar o evento da agenda.
    const eventDetails = {
      summary: `${serviceName} na Thainnes Cuba Ciuldin`,
      description: "Seu agendamento de beleza.",
      start: {
        dateTime: startTime,
        timeZone: "America/Sao_Paulo", // Ajuste para o seu fuso horário
      },
      end: {
        dateTime: endTime,
        timeZone: "America/Sao_Paulo", // Ajuste para o seu fuso horário
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

    // 5. Inserir o evento na agenda primária do usuário.
    try {
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventDetails,
      });
      console.log(`Evento criado com sucesso na agenda do usuário ${clientId}.`);
    } catch (error) {
      console.error("Erro ao criar evento na Agenda Google:", error);
      // Aqui você poderia adicionar lógica para lidar com tokens expirados, etc.
    }
  },
);

/**
 * Envia uma notificação para o cliente quando seu agendamento é confirmado.
 */
export const sendAppointmentConfirmationNotification = onDocumentUpdated(
  "appointments/{appointmentId}",
  async (event) => {
    if (!event.data) {
      console.log("Nenhum dado no evento.");
      return;
    }

    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Verifica se o status mudou para 'confirmado'
    if (beforeData.status === "confirmado" || afterData.status !== "confirmado") {
      console.log("O status não mudou para 'confirmado'.");
      return;
    }

    const {clientId, serviceId, startTime} = afterData;

    // Busca os dados do cliente para obter os tokens FCM
    const userDoc = await db.collection("users").doc(clientId).get();
    const userData = userDoc.data();
    const tokens = userData?.fcmTokens;

    if (!tokens || tokens.length === 0) {
      console.log(`Cliente ${clientId} não possui tokens FCM para notificar.`);
      return;
    }

    // Busca o nome do serviço para a mensagem
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    const serviceName = serviceDoc.data()?.name || "Seu serviço";
    const formattedDate = new Date(startTime).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const payload = {
      notification: {
        title: "✅ Agendamento Confirmado!",
        body: `${serviceName} em ${formattedDate} foi confirmado. Mal podemos esperar para te ver!`,
        icon: "/icons/icon-192x192.png",
        click_action: "/profile",
      },
    };

    try {
      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log(`Notificação de confirmação enviada para ${clientId}:`, response.successCount);
      // Aqui, você pode adicionar a mesma lógica de limpeza de token inválido que existe na outra função
    } catch (error) {
      console.error("Erro ao enviar notificação de confirmação:", error);
    }
  },
);
