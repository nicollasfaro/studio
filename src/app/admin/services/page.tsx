'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Service } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const serviceSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  price: z.coerce.number().min(0, 'O preço deve ser um número positivo.'),
  durationMinutes: z.coerce.number().int().min(1, 'A duração deve ser pelo menos 1 minuto.'),
  imageId: z.string().min(1, 'Por favor, selecione uma imagem.'),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function AdminServicesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isEditing, setIsEditing] = useState<Service | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<Service | null>(null);

  const servicesRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const { data: services, isLoading } = useCollection<Service>(servicesRef);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      durationMinutes: 30,
      imageId: '',
    },
  });

  const onSubmit = async (values: ServiceFormValues) => {
    try {
      if (isEditing) {
        // Update existing service
        const serviceDocRef = doc(firestore, 'services', isEditing.id);
        setDocumentNonBlocking(serviceDocRef, values, { merge: true });
        toast({
          title: 'Serviço Atualizado!',
          description: `O serviço "${values.name}" foi atualizado com sucesso.`,
        });
      } else {
        // Add new service
        addDocumentNonBlocking(servicesRef, values);
        toast({
          title: 'Serviço Adicionado!',
          description: `O serviço "${values.name}" foi adicionado com sucesso.`,
        });
      }
      form.reset();
      setIsEditing(null);
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o serviço. Tente novamente.',
      });
    }
  };

  const handleDeleteService = async () => {
    if (!showDeleteAlert) return;
    try {
        const serviceDocRef = doc(firestore, 'services', showDeleteAlert.id);
        deleteDocumentNonBlocking(serviceDocRef);
        toast({
            title: 'Serviço Removido!',
            description: `O serviço "${showDeleteAlert.name}" foi removido.`,
        });
        setShowDeleteAlert(null);
    } catch (error) {
        console.error('Erro ao remover serviço:', error);
        toast({
            variant: 'destructive',
            title: 'Erro ao remover',
            description: 'Não foi possível remover o serviço.',
        });
    }
  };

  const handleEditClick = (service: Service) => {
    setIsEditing(service);
    form.reset(service);
  };
  
  const handleCancelEdit = () => {
      setIsEditing(null);
      form.reset({
        name: '',
        description: '',
        price: 0,
        durationMinutes: 30,
        imageId: '',
      });
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</CardTitle>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Manicure Completa" {...field} />
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
                        <Textarea placeholder="Descreva o serviço..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="imageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem do Serviço</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma imagem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PlaceHolderImages.map((img) => (
                            <SelectItem key={img.id} value={img.id}>
                              {img.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          <Input type="number" placeholder="50.00" {...field} />
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
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {isEditing && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {isEditing ? 'Salvar Alterações' : 'Adicionar Serviço'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      <div className="md:col-span-2">
        <AlertDialog>
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
                    {isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                        <TableCell>
                            <Skeleton className="h-4 w-[150px]" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-4 w-[60px]" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell className="text-right">
                            <Skeleton className="h-8 w-16 ml-auto" />
                        </TableCell>
                        </TableRow>
                    ))}
                    {services?.map((service) => (
                    <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>R${service.price.toFixed(2)}</TableCell>
                        <TableCell>{service.durationMinutes} min</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(service)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setShowDeleteAlert(service)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </AlertDialogTrigger>
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
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso removerá permanentemente o serviço "{showDeleteAlert?.name}" do banco de dados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowDeleteAlert(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteService} className="bg-destructive hover:bg-destructive/90">
                        Sim, remover
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
