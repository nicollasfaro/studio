
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import type { Promotion, Service, GalleryImage } from '@/lib/types';
import { PlusCircle, Edit, Trash2, List } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';


const promotionSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  discountPercentage: z.coerce.number().min(1, 'O desconto deve ser de no mínimo 1%.').max(100, 'O desconto não pode passar de 100%.'),
  imageId: z.string().min(1, 'Por favor, selecione uma imagem.'),
  serviceIds: z.array(z.string()).min(1, 'Selecione pelo menos um serviço.'),
  // Dates are stored as strings, validation for date logic is handled separately if needed
  startDate: z.string().min(1, 'Data de início é obrigatória.'),
  endDate: z.string().min(1, 'Data de fim é obrigatória.'),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

export default function AdminPromotionsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isMobile = useIsMobile();

  const [view, setView] = useState<'list' | 'form'>('list');
  const [isEditing, setIsEditing] = useState<Promotion | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<Promotion | null>(null);

  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const promotionsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'promotions') : null), [firestore]);
  
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesRef);
  const { data: promotions, isLoading: isLoadingPromotions } = useCollection<Promotion>(promotionsRef);

  const galleryImagesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'galleryImages') : null), [firestore]);
  const { data: galleryImages, isLoading: isLoadingGallery } = useCollection<GalleryImage>(galleryImagesRef);

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: '',
      description: '',
      discountPercentage: 10,
      imageId: '',
      serviceIds: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    },
  });

  const onSubmit = (values: PromotionFormValues) => {
    if (!firestore || !promotionsRef) return;
    
      const promotionData = {
          ...values,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString()
      }

      if (isEditing) {
        const promotionDocRef = doc(firestore, 'promotions', isEditing.id);
        setDoc(promotionDocRef, promotionData, { merge: true }).then(() => {
          toast({
            title: 'Promoção Atualizada!',
            description: `A promoção "${values.name}" foi atualizada com sucesso.`,
          });
          handleCancelEdit();
        }).catch(error => {
          console.error('Erro ao atualizar promoção:', error);
          toast({
            variant: 'destructive',
            title: 'Erro ao atualizar',
            description: 'Não foi possível atualizar a promoção.',
          });
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: promotionDocRef.path,
            operation: 'update',
            requestResourceData: promotionData
          }));
        });

      } else {
        addDoc(promotionsRef, promotionData).then(() => {
          toast({
            title: 'Promoção Adicionada!',
            description: `A promoção "${values.name}" foi adicionada com sucesso.`,
          });
          handleCancelEdit();
        }).catch(error => {
          console.error('Erro ao adicionar promoção:', error);
          toast({
            variant: 'destructive',
            title: 'Erro ao adicionar',
            description: 'Não foi possível adicionar a promoção.',
          });
           errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: promotionsRef.path,
            operation: 'create',
            requestResourceData: promotionData
          }));
        });
      }
  };

  const handleDeletePromotion = () => {
    if (!showDeleteAlert || !firestore) return;
    
        const promotionDocRef = doc(firestore, 'promotions', showDeleteAlert.id);
        deleteDoc(promotionDocRef).then(() => {
          toast({
              title: 'Promoção Removida!',
              description: `A promoção "${showDeleteAlert.name}" foi removida.`,
          });
          setShowDeleteAlert(null);
        }).catch(error => {
          console.error('Erro ao remover promoção:', error);
          toast({
              variant: 'destructive',
              title: 'Erro ao remover',
              description: 'Não foi possível remover a promoção.',
          });
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: promotionDocRef.path,
            operation: 'delete',
          }));
        });
  };

  const handleEditClick = (promotion: Promotion) => {
    setIsEditing(promotion);
    form.reset({
        ...promotion,
        startDate: new Date(promotion.startDate).toISOString().split('T')[0],
        endDate: new Date(promotion.endDate).toISOString().split('T')[0],
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
        discountPercentage: 10,
        imageId: '',
        serviceIds: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
      });
      if (isMobile) {
        setView('list');
      }
  }

  const isLoading = isLoadingServices || isLoadingPromotions || isLoadingGallery;

  const FormCard = () => (
     <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isEditing ? 'Editar Promoção' : 'Adicionar Nova Promoção'}</CardTitle>
            {isMobile && (
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(null); setView('list'); }}>
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
                    <FormLabel>Nome da Promoção</FormLabel>
                    <FormControl><Input placeholder="Ex: Especial de Verão" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Descreva a promoção..." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="imageId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Imagem da Promoção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingGallery}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={isLoadingGallery ? "Carregando imagens..." : "Selecione uma imagem"} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {galleryImages?.map((img) => (
                        <SelectItem key={img.id} value={img.id}>{img.description}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="discountPercentage"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Desconto (%)</FormLabel>
                    <FormControl><Input type="number" placeholder="15" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="serviceIds"
                render={() => (
                <FormItem>
                    <FormLabel>Serviços Aplicáveis</FormLabel>
                    <ScrollArea className="h-32 w-full rounded-md border p-4">
                    {services?.map((service) => (
                        <FormField
                        key={service.id}
                        control={form.control}
                        name="serviceIds"
                        render={({ field }) => (
                            <FormItem key={service.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                checked={field.value?.includes(service.id)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? field.onChange([...(field.value || []), service.id])
                                    : field.onChange(field.value?.filter((value) => value !== service.id));
                                }}
                                />
                            </FormControl>
                            <FormLabel className="font-normal">{service.name}</FormLabel>
                            </FormItem>
                        )}
                        />
                    ))}
                    </ScrollArea>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Data de Fim</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
            {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {isEditing ? 'Salvar Alterações' : 'Adicionar Promoção'}
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
                <CardTitle>Promoções Cadastradas</CardTitle>
                 {isMobile && (
                    <Button variant="default" size="sm" onClick={() => setView('form')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading &&
                        Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        {promotions?.map((promo) => (
                        <TableRow key={promo.id}>
                            <TableCell className="font-medium">{promo.name}</TableCell>
                            <TableCell>{promo.discountPercentage}%</TableCell>
                            <TableCell>
                                {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(promo)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setShowDeleteAlert(promo)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                {!isLoading && promotions?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma promoção cadastrada ainda.</p>
                )}
            </CardContent>
        </Card>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso removerá permanentemente a promoção "{showDeleteAlert?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowDeleteAlert(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePromotion} className="bg-destructive hover:bg-destructive/90">
                    Sim, remover
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );

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
