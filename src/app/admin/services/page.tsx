
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
import { PlusCircle, Edit, Trash2, List } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox"
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const timeSlots = Array.from({ length: 24 * 2 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

const daysOfWeek = [
    { id: 1, label: 'Segunda' },
    { id: 2, label: 'Terça' },
    { id: 3, label: 'Quarta' },
    { id: 4, label: 'Quinta' },
    { id: 5, label: 'Sexta' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
];

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
  isProfessionalSchedule: z.boolean().default(false),
  professionalName: z.string().optional(),
  customStartTime: z.string().optional(),
  customEndTime: z.string().optional(),
  customWorkingDays: z.array(z.number()).optional(),
}).refine(data => {
    if (data.isPriceFrom) {
        return data.priceShortHair != null && data.priceMediumHair != null && data.priceLongHair != null;
    }
    return true;
}, {
    message: "Preencha os preços para todos os comprimentos de cabelo.",
    path: ['priceShortHair'],
}).refine(data => {
    if (data.isProfessionalSchedule) {
        return !!data.professionalName && data.professionalName.length > 2 && !!data.customStartTime && !!data.customEndTime && !!data.customWorkingDays && data.customWorkingDays.length > 0;
    }
    return true;
}, {
    message: "Configure o nome do profissional, dias e horários da agenda.",
    path: ['professionalName'],
}).refine(data => {
    if (data.isProfessionalSchedule && data.customStartTime && data.customEndTime) {
        return data.customStartTime < data.customEndTime;
    }
    return true;
}, {
    message: "O horário de término deve ser após o de início.",
    path: ['customEndTime'],
});


type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function AdminServicesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isMobile = useIsMobile();

  const [view, setView] = useState<'list' | 'form'>('list');
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
      isProfessionalSchedule: false,
      professionalName: '',
      customStartTime: '09:00',
      customEndTime: '18:00',
      customWorkingDays: [],
    },
  });

  const isPriceFrom = form.watch('isPriceFrom');
  const isProfessionalSchedule = form.watch('isProfessionalSchedule');

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
      customWorkingDays: service.customWorkingDays || [],
    });
    if (isMobile) {
        setView('form');
    }
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
        isProfessionalSchedule: false,
        professionalName: '',
        customStartTime: '09:00',
        customEndTime: '18:00',
        customWorkingDays: [],
      });
      if (isMobile) {
        setView('list');
      }
  }

  const isLoading = isLoadingServices || isLoadingGallery;

  const FormCard = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</CardTitle>
        {isMobile && (
            <Button variant="outline" size="sm" onClick={() => setView('list')}>
                <List className="mr-2 h-4 w-4" />
                Ver Lista
            </Button>
        )}
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

            <Separator />
            
            <FormField
                control={form.control}
                name="isProfessionalSchedule"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Serviço com Profissional Específico?</FormLabel>
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
            
            {isProfessionalSchedule && (
                <div className="space-y-4 p-4 border rounded-md">
                     <FormField
                        control={form.control}
                        name="professionalName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Profissional</FormLabel>
                                <FormControl><Input placeholder="Ex: Ana Silva" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="customStartTime"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Abertura (Agenda Própria)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {timeSlots.map(time => (
                                    <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="customEndTime"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Fechamento (Agenda Própria)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {timeSlots.map(time => (
                                    <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </FormItem>
                        )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="customWorkingDays"
                        render={() => (
                            <FormItem>
                                <FormLabel>Dias (Agenda Própria)</FormLabel>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {daysOfWeek.map((day) => (
                                    <FormField
                                    key={day.id}
                                    control={form.control}
                                    name="customWorkingDays"
                                    render={({ field }) => {
                                        return (
                                        <FormItem key={day.id} className="flex flex-row items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(day.id)}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), day.id])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== day.id
                                                        )
                                                    )
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className="font-normal text-sm">
                                                {day.label}
                                            </FormLabel>
                                        </FormItem>
                                        )
                                    }}
                                    />
                                ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
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
  );

  const ListCard = () => (
      <AlertDialog>
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Serviços Cadastrados</CardTitle>
            {isMobile && (
                <Button variant="default" size="sm" onClick={() => setView('form')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar
                </Button>
            )}
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
  )

  if (isMobile) {
    return (
        <div className="w-full">
            {view === 'form' ? <FormCard /> : <ListCard />}
        </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <FormCard />
      </div>

      <div className="md:col-span-2">
        <ListCard />
      </div>
    </div>
  );
}

    