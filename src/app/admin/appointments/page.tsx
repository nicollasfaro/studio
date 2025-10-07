'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import debounce from 'lodash.debounce';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, CheckCircle, XCircle, Camera, ChevronLeft, ChevronRight, AlertTriangle, MessageSquare, Loader2, Send, Check } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUserData } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, limit, startAfter, where, writeBatch, DocumentSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Appointment, Service, ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

const APPOINTMENTS_PER_PAGE = 6;

const contestSchema = z.object({
  contestReason: z.string().min(10, { message: "O motivo deve ter pelo menos 10 caracteres." }),
  contestedHairLength: z.enum(["curto", "medio", "longo"], { required_error: "Selecione o comprimento correto." }),
});

type ContestFormValues = z.infer<typeof contestSchema>;

function ChatDialog({ appointmentId, clientName, serviceName }: { appointmentId: string, clientName: string, serviceName?: string }) {
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const appointmentRef = useMemoFirebase(() => firestore ? doc(firestore, 'appointments', appointmentId) : null, [firestore, appointmentId]);
    const { data: appointmentData } = useDoc<Appointment>(appointmentRef);

    const messagesRef = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'appointments', appointmentId, 'messages'), orderBy('timestamp', 'asc')) : null,
        [firestore, appointmentId]
    );
    const { data: messages, isLoading: isLoadingMessages } = useCollection<ChatMessage>(messagesRef);
    
    // Marcar mensagens como lidas
    useEffect(() => {
        if (!firestore || !messages || messages.length === 0) return;
        
        const batch = writeBatch(firestore);
        const unreadMessages = messages.filter(msg => msg.senderId !== 'admin' && !msg.isRead);

        if (unreadMessages.length > 0) {
            unreadMessages.forEach(msg => {
                const msgRef = doc(firestore, 'appointments', appointmentId, 'messages', msg.id);
                batch.update(msgRef, { isRead: true });
            });
            batch.commit().catch(console.error);
        }

    }, [messages, firestore, appointmentId]);

    // Lógica de "digitando..."
    const updateTypingStatus = useCallback(debounce((isTyping: boolean) => {
        if (appointmentRef) {
            updateDoc(appointmentRef, { adminTyping: isTyping });
        }
    }, 500), [appointmentRef]);

    useEffect(() => {
        updateTypingStatus(newMessage.trim().length > 0);
        return () => {
            updateTypingStatus.cancel();
        };
    }, [newMessage, updateTypingStatus]);


    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages, appointmentData?.clientTyping]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !firestore) return;

        setIsSending(true);
        const messageData: Omit<ChatMessage, 'id'> = {
            appointmentId: appointmentId,
            senderId: 'admin',
            senderName: 'Admin',
            text: newMessage.trim(),
            timestamp: serverTimestamp(),
            isRead: false,
        };

        try {
            await addDoc(collection(firestore, 'appointments', appointmentId, 'messages'), messageData);
            setNewMessage('');
            updateTypingStatus(false);
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <DialogContent className="max-w-lg flex flex-col h-[70vh]">
            <DialogHeader>
                <DialogTitle>Chat com {clientName}</DialogTitle>
                <DialogDescription>
                    Conversa sobre o agendamento de {serviceName}
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
                 <div className="space-y-4 py-4">
                    {isLoadingMessages && <p>Carregando mensagens...</p>}
                    {messages?.map((msg, index) => (
                        <div key={msg.id || index} className={cn("flex items-end gap-2", msg.senderId === 'admin' ? "justify-end" : "justify-start")}>
                           <div className={cn("max-w-xs rounded-lg px-3 py-2", msg.senderId === 'admin' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                <p className="text-sm break-words">{msg.text}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <p className="text-xs opacity-70">{msg.timestamp ? format(new Date(msg.timestamp?.toDate()), 'HH:mm') : ''}</p>
                                    {msg.senderId === 'admin' && (
                                        msg.isRead ? 
                                        <Check size={16} className="text-blue-400" /> :
                                        <Check size={16} className="opacity-70" />
                                    )}
                                </div>
                           </div>
                        </div>
                    ))}
                    {appointmentData?.clientTyping && (
                         <div className="flex items-end gap-2 justify-start">
                           <div className="max-w-xs rounded-lg px-3 py-2 bg-muted">
                                <p className="text-sm italic">Digitando...</p>
                           </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-4 border-t">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        </DialogContent>
    );
}

function ContestDialog({ appointment, service, onOpenChange }: { appointment: Appointment, service: Service | undefined, onOpenChange: (open: boolean) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ContestFormValues>({
    resolver: zodResolver(contestSchema),
    defaultValues: {
      contestReason: '',
      contestedHairLength: appointment.hairLength
    }
  });
  
  const contestedLength = form.watch('contestedHairLength');
  const contestedPrice = useMemo(() => {
    if (!service || !service.isPriceFrom || !contestedLength) return service?.price;
    const prices = {
      curto: service.priceShortHair,
      medio: service.priceMediumHair,
      longo: service.priceLongHair,
    };
    return prices[contestedLength];
  }, [contestedLength, service]);

  const onSubmit = async (values: ContestFormValues) => {
    if (!firestore || !appointment.id) return;
    setIsSubmitting(true);

    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    const updateData = {
      status: 'contestado',
      contestStatus: 'pending',
      contestReason: values.contestReason,
      contestedHairLength: values.contestedHairLength,
      contestedPrice: contestedPrice,
    };

    try {
      await updateDoc(appointmentRef, updateData);
      toast({
        title: 'Agendamento Contestado!',
        description: 'A contestação foi enviada para o cliente.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error contesting appointment:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao contestar',
        description: 'Não foi possível enviar a contestação.',
      });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: appointmentRef.path,
        operation: 'update',
        requestResourceData: updateData,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Contestar Agendamento</DialogTitle>
        <DialogDescription>
          Explique o motivo da contestação e selecione o comprimento correto do cabelo. O cliente será notificado para aceitar ou recusar.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="contestedHairLength"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Comprimento do Cabelo Correto</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value="curto" /></FormControl>
                      <FormLabel className="font-normal">Curto (R${service?.priceShortHair?.toFixed(2)})</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value="medio" /></FormControl>
                      <FormLabel className="font-normal">Médio (R${service?.priceMediumHair?.toFixed(2)})</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value="longo" /></FormControl>
                      <FormLabel className="font-normal">Longo (R${service?.priceLongHair?.toFixed(2)})</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="contestReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo da Contestação</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ex: A foto de referência mostra um cabelo médio, não curto." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="p-4 bg-secondary rounded-md">
            <p className="font-semibold">Novo Valor Proposto: <span className="text-primary">R${contestedPrice?.toFixed(2)}</span></p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Contestação
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

interface AppointmentsTableProps {
  services: (Omit<Service, 'id'> & { id: string })[];
  appointments: Appointment[];
  isLoading: boolean;
}

function AppointmentsTable({ services, appointments, isLoading }: AppointmentsTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [contestDialogState, setContestDialogState] = useState<{ isOpen: boolean; appointment: Appointment | null }>({ isOpen: false, appointment: null });
  const [chatDialogState, setChatDialogState] = useState<{ isOpen: boolean; appointment: Appointment | null }>({ isOpen: false, appointment: null });
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const getServiceDetails = (serviceId: string) => {
    return services.find(s => s.id === serviceId);
  };

  const handleStatusChange = (appointment: Appointment, newStatus: 'confirmado' | 'cancelado' | 'finalizado') => {
    if (!firestore || !appointment.id) return;
    setUpdatingStatusId(appointment.id);
    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    const updateData = { status: newStatus, contestStatus: null }; // Clear contest status on manual change

    updateDoc(appointmentRef, updateData).then(() => {
      toast({
        title: 'Status do Agendamento Atualizado!',
        description: `O agendamento foi marcado como ${newStatus}.`,
      });
    }).catch(error => {
      console.error("Error updating appointment status:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar o status do agendamento.',
      });
       errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: appointmentRef.path,
          operation: 'update',
          requestResourceData: updateData,
       }));
    }).finally(() => {
      setUpdatingStatusId(null);
    });
  };
  
  const getBadgeVariant = (status: Appointment['status']) => {
    switch (status) {
      case 'Marcado':
        return 'secondary';
      case 'confirmado':
        return 'default';
      case 'finalizado':
        return 'outline';
      case 'cancelado':
        return 'destructive';
      case 'contestado':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getBadgeStyle = (status: Appointment['status']) => {
     if (status === 'contestado') {
        return { backgroundColor: 'hsl(var(--accent-hsl))', color: 'hsl(var(--accent-foreground))' };
     }
     return {};
  }


  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead>Data e Hora</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: APPOINTMENTS_PER_PAGE }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          {!isLoading && appointments.length === 0 && (
              <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum agendamento encontrado para este filtro.
                  </TableCell>
              </TableRow>
          )}
          {!isLoading && appointments?.map((apt) => {
            const service = getServiceDetails(apt.serviceId);
            const canContest = service?.isPriceFrom && apt.hairPhotoUrl && apt.status === 'Marcado';
            const canChat = apt.status === 'confirmado';
            const isUpdating = updatingStatusId === apt.id;

            return (
            <TableRow key={apt.id} className={apt.viewedByAdmin === false ? 'bg-secondary/50' : ''}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{apt.clientName}</div>
                  {apt.hairPhotoUrl && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Foto de Referência do Cabelo</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 relative aspect-square">
                          <Image
                              src={apt.hairPhotoUrl}
                              alt={`Referência para ${apt.clientName}`}
                              fill
                              style={{objectFit:"contain"}}
                              className="rounded-md"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{apt.clientEmail}</div>
              </TableCell>
              <TableCell>{service?.name}</TableCell>
              <TableCell>{format(new Date(apt.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
              <TableCell>
                <Badge variant={getBadgeVariant(apt.status)} style={getBadgeStyle(apt.status)} className="capitalize">
                  {apt.status === 'contestado' ? 'Aguardando Cliente' : apt.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canChat && (
                          <DropdownMenuItem onClick={() => setChatDialogState({ isOpen: true, appointment: apt })}>
                            <MessageSquare className="mr-2 h-4 w-4 text-blue-500" />
                            Conversar
                          </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleStatusChange(apt, 'confirmado')} disabled={apt.status === 'confirmado' || apt.status === 'finalizado' || apt.status === 'cancelado'}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Confirmar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(apt, 'finalizado')} disabled={apt.status === 'finalizado' || apt.status === 'cancelado'}>
                        <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                        Finalizar
                      </DropdownMenuItem>
                      {canContest && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setContestDialogState({ isOpen: true, appointment: apt })}>
                            <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                            Contestar Valor
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleStatusChange(apt, 'cancelado')} disabled={apt.status === 'cancelado' || apt.status === 'finalizado'}>
                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                        Cancelar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
      <Dialog open={contestDialogState.isOpen} onOpenChange={(isOpen) => setContestDialogState({ isOpen, appointment: isOpen ? contestDialogState.appointment : null })}>
        {contestDialogState.appointment && (
          <ContestDialog 
            appointment={contestDialogState.appointment} 
            service={getServiceDetails(contestDialogState.appointment.serviceId)}
            onOpenChange={(isOpen) => setContestDialogState({ isOpen, appointment: isOpen ? contestDialogState.appointment : null })}
          />
        )}
      </Dialog>
      <Dialog open={chatDialogState.isOpen} onOpenChange={(isOpen) => setChatDialogState({ isOpen, appointment: isOpen ? chatDialogState.appointment : null })}>
        {chatDialogState.appointment && (
          <ChatDialog 
            appointmentId={chatDialogState.appointment.id}
            clientName={chatDialogState.appointment.clientName}
            serviceName={getServiceDetails(chatDialogState.appointment.serviceId)?.name}
          />
        )}
      </Dialog>
    </>
  )
}

export default function AdminAppointmentsPage() {
  const firestore = useFirestore();
  const [filter, setFilter] = useState('upcoming');

  const [page, setPage] = useState(0);
  const [paginationSnapshots, setPaginationSnapshots] = useState<(DocumentSnapshot | null)[]>([null]);
  
  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesRef);

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'appointments'), orderBy('startTime', 'desc'));

    const now = new Date();
    if (filter === 'upcoming') {
      q = query(q, where('startTime', '>=', now.toISOString()));
    } else if (filter === 'history') {
      q = query(q, where('startTime', '<', now.toISOString()));
    }

    if (page > 0 && paginationSnapshots[page]) {
      return query(q, startAfter(paginationSnapshots[page]), limit(APPOINTMENTS_PER_PAGE));
    }

    return query(q, limit(APPOINTMENTS_PER_PAGE));
}, [firestore, filter, page, paginationSnapshots]);

const { data: paginatedAppointments, isLoading: isLoadingAppointments, snapshots } = useCollection<Appointment>(appointmentsQuery);


  useEffect(() => {
    if (!firestore || !paginatedAppointments) return;

    const unviewedAppointments = paginatedAppointments.filter(apt => apt.viewedByAdmin === false);

    if (unviewedAppointments.length > 0) {
      const batch = writeBatch(firestore);
      unviewedAppointments.forEach(apt => {
        if (apt.id) { // Ensure apt.id is not undefined
          const appointmentRef = doc(firestore, 'appointments', apt.id);
          batch.update(appointmentRef, { viewedByAdmin: true });
        }
      });
      batch.commit().catch(console.error);
    }
  }, [paginatedAppointments, firestore]);
  
  const handleNextPage = () => {
    if (!snapshots || snapshots.length === 0 || snapshots.length < APPOINTMENTS_PER_PAGE) return;
    
    const lastVisible = snapshots[snapshots.length - 1];
    if (lastVisible) {
      setPaginationSnapshots(prev => [...prev, lastVisible]);
      setPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page === 0) return;
    setPage(prev => prev - 1);
    setPaginationSnapshots(prev => prev.slice(0, -1));
  };


  const isLoading = isLoadingServices || isLoadingAppointments;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Gerenciamento de Agendamentos</CardTitle>
        <Tabs defaultValue={filter} onValueChange={(value) => { setFilter(value); setPage(0); setPaginationSnapshots([null]); }} className="w-auto">
          <TabsList>
            <TabsTrigger value="upcoming">Próximos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoadingServices ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : services ? (
          <AppointmentsTable services={services} appointments={paginatedAppointments || []} isLoading={isLoadingAppointments} />
        ) : (
           <p className="py-8 text-center text-muted-foreground">
            Não foi possível carregar os serviços necessários.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-end space-x-2 py-4">
          <span className="text-sm text-muted-foreground">
            Página {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!paginatedAppointments || paginatedAppointments.length < APPOINTMENTS_PER_PAGE || isLoading}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
    </Card>
  );
}
