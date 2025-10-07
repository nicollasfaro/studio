
import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";

// Inicializa o Firebase Admin SDK.
// A função irá autenticar-se automaticamente no ambiente do Firebase.
admin.initializeApp();

/**
 * Cloud Function (v2) que é acionada na criação de um novo documento de
 * promoção. Ela envia uma notificação push para todos os usuários que se
 * inscreveram.
 */
export const sendPromotionNotification = onDocumentCreated(
  "promotions/{promotionId}",
  async (event) => {
    // Pega os dados do evento.
    const snapshot = event.data;
    if (!snapshot) {
      console.log("Nenhum dado no evento, encerrando a função.");
      return;
    }

    const promotionData = snapshot.data();
    const {name, description} = promotionData;

    console.log(`Nova promoção: "${name}". Enviando notificações.`);

    // 1. Buscar todos os usuários do Firestore.
    const usersSnapshot = await admin.firestore().collection("users").get();

    // 2. Coletar todos os tokens de notificação (FCM tokens).
    const tokens: string[] = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      // Verifica se o usuário tem tokens salvos e se é um array.
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        tokens.push(...userData.fcmTokens);
      }
    });

    if (tokens.length === 0) {
      console.log("Nenhum usuário inscrito para receber notificações.");
      return;
    }

    console.log(`Encontrados ${tokens.length} tokens para notificar.`);

    // 3. Montar a mensagem da notificação.
    const payload = {
      notification: {
        title: `🎉 Nova Promoção: ${name}!`,
        body: description,
        icon: "/icons/icon-192x192.png",
        click_action: "/promotions",
      },
    };

    // 4. Enviar a notificação para todos os tokens.
    try {
      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log("Notificações enviadas com sucesso:", response);

      // Opcional: Limpar tokens inválidos do banco de dados.
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error("Falha ao enviar para token:", tokens[index], error);
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            // Lógica para remover o token inválido do usuário (avançado).
          }
        }
      });
    } catch (error) {
      console.error("Erro ao enviar notificações:", error);
    }
  },
);


/**
 * Cloud Function (v2) que monitora alterações nos agendamentos e envia uma
 * notificação por WhatsApp para o administrador em caso de novo agendamento ou
 * cancelamento.
 */
export const sendAppointmentStatusNotification = onDocumentWritten(
  "appointments/{appointmentId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Cenário 1: Novo Agendamento
    const isNewAppointment = !beforeData && afterData?.status === "Marcado";
    // Cenário 2: Agendamento Cancelado
    const isCancelled = beforeData?.status !== "cancelado" && afterData?.status === "cancelado";

    if (!isNewAppointment && !isCancelled) {
      console.log("Nenhuma alteração de status relevante. Encerrando.");
      return;
    }

    // Obter número de WhatsApp do admin
    const configDoc = await admin.firestore().collection("config").doc("notifications").get();
    const whatsappNumber = configDoc.data()?.notificationWhatsapp;

    if (!whatsappNumber) {
      console.warn("Número de WhatsApp do administrador não configurado. Notificação não enviada.");
      return;
    }

    const {clientName, startTime} = afterData ?? {};
    const formattedDate = format(new Date(startTime), "dd/MM/yyyy 'às' HH:mm", {locale: ptBR});
    const servicesRef = admin.firestore().collection("services").doc(afterData?.serviceId);
    const serviceDoc = await servicesRef.get();
    const serviceName = serviceDoc.data()?.name || "Serviço não encontrado";


    let messageBody = "";
    if (isNewAppointment) {
      messageBody = `🔔 *Novo Agendamento!*\n\n*Cliente:* ${clientName}\n*Serviço:* ${serviceName}\n*Data:* ${formattedDate}`;
    } else if (isCancelled) {
      const canceller = afterData?.clientName;
      messageBody = `❌ *Agendamento Cancelado!*\n\n*Cliente:* ${canceller}\n*Serviço:* ${serviceName}\n*Data:* ${formattedDate}`;
    }

    // Dados da mensagem para o serviço de WhatsApp
    const whatsappMessage = {
      to: whatsappNumber,
      body: messageBody,
    };

    console.log(`Preparando para enviar mensagem para ${whatsappNumber}: "${messageBody}"`);

    // Aqui você integraria com uma API de WhatsApp (ex: Twilio, Zenvia, etc.)
    // Exemplo de como seria a lógica de envio:
    try {
      // await sendWhatsAppMessage(whatsappMessage);
      console.log("Simulação: Mensagem de WhatsApp enviada com sucesso.", whatsappMessage);
    } catch (error) {
      console.error("Erro ao tentar enviar mensagem de WhatsApp:", error);
    }
  },
);
