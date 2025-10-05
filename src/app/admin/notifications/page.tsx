
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Mail, MessageSquare, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from 'lucide-react';


const notificationSchema = z.object({
  notificationEmail: z.string().email('Por favor, insira um e-mail válido.').or(z.literal('')),
  notificationWhatsapp: z.string().min(10, 'O número deve ter pelo menos 10 dígitos.').or(z.literal('')),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const configDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'notifications') : null), [firestore]);
  const { data: configData, isLoading: isConfigLoading } = useDoc<NotificationFormValues>(configDocRef);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      notificationEmail: '',
      notificationWhatsapp: '',
    },
  });

  useEffect(() => {
    if (configData) {
      form.reset(configData);
    }
  }, [configData, form]);

  const onSubmit = async (values: NotificationFormValues) => {
    if (!configDocRef) return;

    try {
      setDocumentNonBlocking(configDocRef, values, { merge: true });
      toast({
        title: 'Configurações Salvas!',
        description: 'Suas preferências de notificação foram atualizadas.',
      });
    } catch (error) {
      console.error('Erro ao salvar as configurações:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    }
  };
  
  if (isConfigLoading) {
      return (
          <Card className="max-w-2xl">
              <CardHeader>
                  <CardTitle>Configurações de Notificação</CardTitle>
                  <CardDescription>Defina para onde as notificações de novos agendamentos serão enviadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
              </CardContent>
              <CardFooter>
                   <Skeleton className="h-10 w-24" />
              </CardFooter>
          </Card>
      )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Configurações de Notificação</CardTitle>
        <CardDescription>
          Defina para onde as notificações de novos agendamentos serão enviadas. Deixe em branco para desativar.
        </CardDescription>
      </CardHeader>
       <Alert className="mx-6 mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Ação Adicional Necessária</AlertTitle>
          <AlertDescription>
            Configurar estes campos não ativa as notificações automaticamente. É necessário implementar uma Cloud Function no Firebase para ler estes dados e enviar os e-mails ou mensagens via WhatsApp.
          </AlertDescription>
        </Alert>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="notificationEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail para Notificação</FormLabel>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input type="email" placeholder="admin@exemplo.com" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notificationWhatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp para Notificação</FormLabel>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="5511999998888" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
