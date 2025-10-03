'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Service } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const serviceFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome do serviço deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  price: z.coerce.number().positive({ message: 'O preço deve ser um número positivo.' }),
  durationMinutes: z.coerce.number().int().positive({ message: 'A duração deve ser um número inteiro positivo.' }),
});

export default function AdminServicesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = getStorage();
  const servicesCollectionRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  
  const { data: services, isLoading } = useCollection<Omit<Service, 'id'>>(servicesCollectionRef);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      durationMinutes: 30,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const onSubmit = async (values: z.infer<typeof serviceFormSchema>) => {
    if (!imageFile) {
      toast({
        variant: 'destructive',
        title: 'Imagem em falta',
        description: 'Por favor, carregue uma imagem para o serviço.',
      });
      return;
    }

    try {
      // 1. Upload image to Firebase Storage
      const imageRef = ref(storage, `services/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(snapshot.ref);

      // 2. Add service data with image URL to Firestore
      await addDocumentNonBlocking(servicesCollectionRef, { ...values, imageUrl });
      
      toast({
        title: 'Serviço Adicionado!',
        description: `O serviço "${values.name}" foi criado com sucesso.`,
      });
      form.reset();
      setImageFile(null);
      // Clear file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error("Erro ao adicionar serviço:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível adicionar o serviço. Verifique suas permissões e a configuração de armazenamento.',
      });
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Novo Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="Corte de Cabelo Feminino" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Inclui lavagem, corte e secagem." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Preço (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="80.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Duração (min)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="60" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 </div>
                 <FormItem>
                    <FormLabel>Imagem do Serviço</FormLabel>
                    <FormControl>
                        <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Serviços Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-[80px] ml-auto" /></TableCell>
                  </TableRow>
                ))}
                {services?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>R${service.price.toFixed(2)}</TableCell>
                    <TableCell>{service.durationMinutes} min</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" disabled>Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {!isLoading && services?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum serviço cadastrado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    