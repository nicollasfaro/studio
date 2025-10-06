
'use client';

import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface NotificationSubscriberProps {
  feature: string;
  title: string;
  description: string;
}

export default function NotificationSubscriber({ feature, title, description }: NotificationSubscriberProps) {
  const { toast } = useToast();
  const app = useFirebaseApp();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  // Function to handle subscription logic
  const handleSubscriptionChange = async (checked: boolean) => {
    if (!app || !user || !firestore) return;

    if (checked) {
      // Subscribe
      if (notificationPermission === 'granted') {
        try {
          const messaging = getMessaging(app);
          // Use your VAPID key from the Firebase console
          const currentToken = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY_HERE' });
          if (currentToken) {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
              fcmTokens: arrayUnion(currentToken)
            });
            setIsSubscribed(true);
            toast({ title: 'Inscrito!', description: `Você receberá ${title.toLowerCase()}.` });
          } else {
            toast({ variant: 'destructive', title: 'Falha na Inscrição', description: 'Não foi possível obter o token de notificação.' });
          }
        } catch (err) {
          console.error('An error occurred while retrieving token. ', err);
          toast({ variant: 'destructive', title: 'Erro de Inscrição', description: 'Ocorreu um erro ao se inscrever.' });
        }
      } else if (notificationPermission === 'default') {
        // Request permission
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          // If permission is granted, call this function again to subscribe
          handleSubscriptionChange(true);
        } else {
            toast({ variant: 'destructive', title: 'Permissão Negada', description: 'Você precisa permitir notificações para se inscrever.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Notificações Bloqueadas', description: 'Por favor, habilite as notificações nas configurações do seu navegador.' });
      }
    } else {
      // Unsubscribe - for simplicity, we remove all tokens. A more complex app might manage tokens individually.
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
          fcmTokens: [] // Or use arrayRemove with the specific token if you store it
        });
        setIsSubscribed(false);
        toast({ title: 'Inscrição Cancelada', description: `Você não receberá mais ${title.toLowerCase()}.` });
      } catch (err) {
        console.error('Error unsubscribing:', err);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível cancelar a inscrição.' });
      }
    }
  };

  // Check initial subscription status from Firestore
  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      // This is a simplified check. A real app might need more robust logic.
      // For now, we assume if there's any token, they are subscribed.
      // getDoc(userDocRef).then(docSnap => {
      //   if (docSnap.exists() && docSnap.data().fcmTokens?.length > 0) {
      //     setIsSubscribed(true);
      //   }
      // });
    }
  }, [user, firestore]);
  
    // Listen for incoming messages
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && app) {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        toast({
          title: payload.notification?.title,
          description: payload.notification?.body,
        });
      });
      return () => unsubscribe();
    }
  }, [app, toast]);


  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <Label htmlFor={`${feature}-notifications`} className="flex flex-col gap-1 cursor-pointer">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </Label>
      <Switch 
        id={`${feature}-notifications`} 
        checked={isSubscribed}
        onCheckedChange={handleSubscriptionChange}
      />
    </div>
  );
}
