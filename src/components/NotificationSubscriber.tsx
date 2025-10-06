
'use client';

import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser, useFirestore, useUserData } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
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
  const { userData } = useUserData();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const [currentToken, setCurrentToken] = useState<string | null>(null);

  // Get current token
  useEffect(() => {
    if (notificationPermission === 'granted' && app) {
      const messaging = getMessaging(app);
      getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY }).then((token) => {
        if(token) {
          setCurrentToken(token);
        }
      }).catch((err) => {
        console.error('An error occurred while retrieving token. ', err);
      });
    }
  }, [notificationPermission, app]);
  
  // Check initial subscription status from Firestore
  useEffect(() => {
    if (userData && currentToken) {
      const isSubscribed = userData.fcmTokens?.includes(currentToken) ?? false;
      setIsSubscribed(isSubscribed);
    }
  }, [userData, currentToken]);


  // Function to handle subscription logic
  const handleSubscriptionChange = async (checked: boolean) => {
    if (!app || !user || !firestore) return;

    if (checked) {
      // Subscribe logic
      if (notificationPermission === 'granted') {
        if (currentToken) {
          try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, { fcmTokens: arrayUnion(currentToken) });
            setIsSubscribed(true);
            toast({ title: 'Inscrito!', description: `Você receberá ${title.toLowerCase()}.` });
          } catch (err) {
            console.error('Error subscribing:', err);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a sua inscrição.' });
          }
        } else {
          toast({ variant: 'destructive', title: 'Falha na Inscrição', description: 'Não foi possível obter o token de notificação. Tente recarregar a página.' });
        }
      } else if (notificationPermission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission !== 'granted') {
          toast({ variant: 'destructive', title: 'Permissão Negada', description: 'Você precisa permitir notificações para se inscrever.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Notificações Bloqueadas', description: 'Por favor, habilite as notificações nas configurações do seu navegador.' });
      }
    } else {
      // Unsubscribe logic
      if (currentToken) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          await updateDoc(userDocRef, { fcmTokens: arrayRemove(currentToken) });
          setIsSubscribed(false);
          toast({ title: 'Inscrição Cancelada', description: `Você não receberá mais ${title.toLowerCase()}.` });
        } catch (err) {
          console.error('Error unsubscribing:', err);
          toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível cancelar a inscrição.' });
        }
      }
    }
  };
  
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
        disabled={notificationPermission === 'denied'}
      />
    </div>
  );
}
