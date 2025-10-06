
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Inicializa o Firebase Admin SDK.
// A função irá autenticar-se automaticamente no ambiente do Firebase.
admin.initializeApp();

/**
 * Cloud Function (v2) que é acionada na criação de um novo documento de promoção.
 * Ela envia uma notificação push para todos os usuários que se inscreveram.
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
