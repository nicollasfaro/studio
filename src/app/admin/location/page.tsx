
'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import type { BusinessLocation } from '@/lib/types';

const locationSchema = z.object({
  address: z.string().min(5, 'O endereço deve ter pelo menos 5 caracteres.'),
  city: z.string().min(2, 'A cidade deve ter pelo menos 2 caracteres.'),
  state: z.string().min(2, 'O estado deve ter pelo menos 2 caracteres.'),
  zipCode: z.string().min(8, 'O CEP deve ter 8 caracteres.').max(9, 'O CEP deve ter no máximo 9 caracteres (com hífen).'),
  country: z.string().min(2, 'O país deve ter pelo menos 2 caracteres.'),
});

type LocationFormValues = z.infer<typeof locationSchema>;

export default function AdminLocationPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const configDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'location') : null), [firestore]);
  const { data: configData, isLoading: isConfigLoading } = useDoc<BusinessLocation>(configDocRef);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Brasil',
    },
  });
  
  const watchedZipCode = useWatch({ control: form.control, name: 'zipCode' });

  useEffect(() => {
    const fetchAddress = async (zip: string) => {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
            const data = await response.json();
            if (!data.erro) {
                form.setValue('address', data.logradouro);
                form.setValue('city', data.localidade);
                form.setValue('state', data.uf);
                toast({ title: 'Endereço encontrado!', description: 'Os campos de endereço foram preenchidos.' });
            } else {
                toast({ title: 'CEP não encontrado', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Erro ao buscar CEP', description: 'Não foi possível consultar o endereço.', variant: 'destructive' });
        }
    };
    
    const plainZipCode = watchedZipCode?.replace(/\D/g, '');
    if (plainZipCode && plainZipCode.length === 8) {
        fetchAddress(plainZipCode);
    }
  }, [watchedZipCode, form, toast]);


  useEffect(() => {
    if (configData) {
      form.reset(configData);
    }
  }, [configData, form]);

  const onSubmit = (values: LocationFormValues) => {
    if (!configDocRef) return;

    setDoc(configDocRef, values, { merge: true }).then(() => {
      toast({
        title: 'Localização Salva!',
        description: 'O endereço do seu salão foi atualizado com sucesso.',
      });
    }).catch(error => {
      console.error('Erro ao salvar a localização:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações de localização.',
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
                  <CardTitle>Localização do Salão</CardTitle>
                  <CardDescription>Informe o endereço do seu estabelecimento.</CardDescription>
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
        <CardTitle>Localização do Salão</CardTitle>
        <CardDescription>
          Informe o endereço do seu estabelecimento. Este endereço será usado para mostrar o mapa para os clientes.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl><Input placeholder="01310-100" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl><Input placeholder="Brasil" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço (Rua, Bairro)</FormLabel>
                   <FormControl>
                      <Input placeholder="Ex: Av. Paulista, 900, Bela Vista" {...field} />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl><Input placeholder="São Paulo" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl><Input placeholder="SP" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Endereço
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
