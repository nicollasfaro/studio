
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
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { BusinessInfo } from '@/lib/types';

const businessInfoSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
});

type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>;

export default function AdminBusinessInfoPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const configDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'businessInfo') : null), [firestore]);
  const { data: configData, isLoading: isConfigLoading } = useDoc<BusinessInfo>(configDocRef);

  const form = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      name: 'Thainnes Cuba Ciuldin',
    },
  });

  useEffect(() => {
    if (configData) {
      form.reset(configData);
    }
  }, [configData, form]);

  const onSubmit = (values: BusinessInfoFormValues) => {
    if (!configDocRef) return;

    setDoc(configDocRef, values, { merge: true }).then(() => {
      toast({
        title: 'Informações Atualizadas!',
        description: 'O nome do seu negócio foi salvo com sucesso.',
      });
    }).catch(error => {
      console.error('Erro ao salvar as informações:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as informações do negócio.',
      });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: configDocRef.path,
        operation: 'update',
        requestResourceData: values,
      }));
    });
  };
  
  if (isConfigLoading) {
      return (
          <Card className="max-w-2xl">
              <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-6">
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
        <CardTitle>Informações do Negócio</CardTitle>
        <CardDescription>
          Edite as informações globais do seu site, como o nome.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Sistema / Negócio</FormLabel>
                  <FormControl>
                    <Input placeholder="Thainnes Cuba Ciuldin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Informações
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    