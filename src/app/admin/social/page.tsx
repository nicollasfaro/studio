
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
import { Facebook, Instagram, Twitter, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const urlSchema = z.string().url('Por favor, insira uma URL válida.').or(z.literal(''));

const socialSchema = z.object({
  facebook: urlSchema,
  instagram: urlSchema,
  twitter: urlSchema,
});

type SocialFormValues = z.infer<typeof socialSchema>;

export default function AdminSocialPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const socialDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'socialMedia', 'links') : null), [firestore]);
  const { data: socialData, isLoading: isSocialLoading } = useDoc<SocialFormValues>(socialDocRef);

  const form = useForm<SocialFormValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: {
      facebook: '',
      instagram: '',
      twitter: '',
    },
  });

  useEffect(() => {
    if (socialData) {
      form.reset(socialData);
    }
  }, [socialData, form]);

  const onSubmit = (values: SocialFormValues) => {
    if (!socialDocRef) return;

    setDoc(socialDocRef, values, { merge: true }).then(() => {
      toast({
        title: 'Links Atualizados!',
        description: 'Os links das redes sociais foram salvos com sucesso.',
      });
    }).catch(error => {
      console.error('Erro ao salvar os links:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar os links das redes sociais.',
      });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: socialDocRef.path,
        operation: 'update',
        requestResourceData: values,
      }));
    });
  };
  
  if (isSocialLoading) {
      return (
          <Card className="max-w-2xl">
              <CardHeader>
                  <CardTitle>Redes Sociais</CardTitle>
                  <CardDescription>Gerencie os links das suas redes sociais que aparecem no rodapé.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <Skeleton className="h-12 w-full" />
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
        <CardTitle>Redes Sociais</CardTitle>
        <CardDescription>
          Gerencie os links das suas redes sociais que aparecem no rodapé. Deixe em branco para não exibir o ícone.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="facebook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook</FormLabel>
                  <div className="flex items-center gap-2">
                    <Facebook className="h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://facebook.com/seu-usuario" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://instagram.com/seu-usuario" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter / X</FormLabel>
                  <div className="flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://twitter.com/seu-usuario" {...field} />
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
              Salvar Links
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
