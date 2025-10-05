
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import type { Service, GalleryImage } from '@/lib/types';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const serviceSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  price: z.coerce.number().min(0, 'O preço deve ser um número positivo.'),
  durationMinutes: z.coerce.number().int().min(1, 'A duração deve ser pelo menos 1 minuto.'),
  imageId: z.string().min(1, 'Por favor, selecione uma imagem.'),
  isPriceFrom: z.boolean().default(false),
  priceShortHair: z.coerce.number().optional(),
  priceMediumHair: z.coerce.number().optional(),
  priceLongHair: z.coerce.number().optional(),
}).refine(data => {
    if (data.isPriceFrom) {
        return data.priceShortHair != null && data.priceMediumHair != null && data.priceLongHair != null;
    }
    return true;
}, {
    message: "Preencha os preços para todos os comprimentos de cabelo.",
    path: ['priceShortHair'], // you can point this to any of the fields
});


type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function AdminServicesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isEditing, setIsEditing] = useState<Service | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<Service | null>(null);

  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesRef);
  
  const galleryImagesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'galleryImages') : null), [firestore]);
  const { data: galleryImages, isLoading: isLoadingGallery } = useCollection<GalleryImage>(galleryImagesRef);


  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      durationMinutes: 30,
      imageId: '',
      isPriceFrom: false,
      priceShortHair: 0,
      priceMediumHair: 0,
      priceLongHair: 0,
    },
  });

  const isPriceFrom = form.watch('isPriceFrom');

  const onSubmit = (values: ServiceFormValues) => {
    if (!firestore || !servicesRef) return;
    
      if (isEditing) {
        const serviceDocRef = doc(firestore, 'services', isEditing.id);
        setDoc(serviceDocRef, values, { merge: true }).then(() => {
            toast({
              title: 'Serviço Atualizado!',
              description: `O serviço "${values.name}" foi atualizado com sucesso.`,
            });
            handleCancelEdit();
        }).catch(error => {
            console.error('Erro ao atualizar serviço:', error);
            toast({
              variant: 'destructive',
              title: 'Erro ao atualizar',
              description: 'Não foi possível atualizar o serviço.',
            });
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: serviceDocRef.path,
                operation: 'update',
                requestResourceData: values,
            }));
        });
      } else {
        addDoc(servicesRef, values).then(() => {
            toast({
              title: 'Serviço Adicionado!',
              description: `O serviço "${values.name}" foi adicionado com sucesso.`,
            });
            handleCancelEdit();
        }).catch(error => {
            console.error('Erro ao adicionar serviço:', error);
            toast({
              variant: 'destructive',
              title: 'Erro ao salvar',
              description: 'Não foi possível salvar o serviço. Tente novamente.',
            });
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: servicesRef.path,
                operation: 'create',
                requestResourceData: values,
            }));
        });
      }
  };

  const handleDeleteService = () => {
    if (!showDeleteAlert || !firestore) return;

        const serviceDocRef = doc(firestore, 'services', showDeleteAlert.id);
        deleteDoc(serviceDocRef).then(() => {
          toast({
              title: 'Serviço Removido!',
              description: `O serviço "${showDeleteAlert.name}" foi removido.`,
          });
          setShowDeleteAlert(null);
        }).catch(error => {
          console.error('Erro ao remover serviço:', error);
          toast({
              variant: 'destructive',
              title: 'Erro ao remover',
              description: 'Não foi possível remover o serviço.',
          });
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: serviceDocRef.path,
            operation: 'delete',
          }));
        });
  };

  const handleEditClick = (service: Service) => {
    setIsEditing(service);
    form.reset({
      ...service,
      priceShortHair: service.priceShortHair || 0,
      priceMediumHair: service.priceMediumHair || 0,
      priceLongHair: service.priceLongHair || 0,
    });
  };
  
  const handleCancelEdit = () => {
      setIsEditing(null);
      form.reset({
        name: '',
        description: '',
        price: 0,
        durationMinutes: 30,
        imageId: '',
        isPriceFrom: false,
        priceShortHair: 0,
        priceMediumHair: 0,
        priceLongHair: 0,
      });
  }

  const isLoading = isLoadingServices || isLoadingGallery;

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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingGallery}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingGallery ? "Carregando imagens..." : "Selecione uma imagem"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {galleryImages?.map((img) => (
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
                 <FormField
                    control={form.control}
                    name="isPriceFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>O valor é "a partir de"?</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                {isPriceFrom ? (
                  <>
                     <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço Base (R$)</FormLabel>
                            <FormControl><Input type="number" placeholder="50.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     <div className="grid grid-cols-3 gap-2">
                        <FormField
                            control={form.control}
                            name="priceShortHair"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Curto</FormLabel>
                                <FormControl><Input type="number" placeholder="70" {...field} /></FormControl>
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="priceMediumHair"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Médio</FormLabel>
                                <FormControl><Input type="number" placeholder="90" {...field} /></FormControl>
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="priceLongHair"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Longo</FormLabel>
                                <FormControl><Input type="number" placeholder="120" {...field} /></FormControl>
                            </FormItem>
                            )}
                        />
                     </div>
                      <FormMessage>{form.formState.errors.priceShortHair?.message}</FormMessage>
                  </>
                ) : (
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
                )}
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
                        <TableCell>{service.isPriceFrom ? `A partir de R$${service.price.toFixed(2)}` : `R$${service.price.toFixed(2)}`}</TableCell>
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
