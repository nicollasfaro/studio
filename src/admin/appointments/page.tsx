'use client';

import { useMemo, useState, useEffect } from 'react';
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
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, CheckCircle, XCircle, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, limit, startAfter, getDocs, where, writeBatch, DocumentSnapshot } from 'firebase/firestore';
import type { Appointment, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const APPOINTMENTS_PER_PAGE = 10;

interface AppointmentsTableProps {
  services: (Omit<Service, 'id'> & { id: string })[];
  appointments: Appointment[];
  isLoading: boolean;
}

function AppointmentsTable({ services, appointments, isLoading }: AppointmentsTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service || { name: 'Serviço não encontrado', price: 0 };
  };

  const handleStatusChange = (appointment: Appointment, newStatus: 'confirmado' | 'cancelado' | 'finalizado') => {
    if (!firestore || !appointment.id) return;
    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    const updateData = { status: newStatus };

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
      default:
        return 'secondary';
    }
  };

  return (
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
          Array.from({ length: 5 }).map((_, i) => (
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
        {!isLoading && appointments?.map((apt) => (
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
                            objectFit="contain"
                            className="rounded-md"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{apt.clientEmail}</div>
            </TableCell>
            <TableCell>{getServiceDetails(apt.serviceId).name}</TableCell>
            <TableCell>{format(new Date(apt.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(apt.status)} className="capitalize">
                {apt.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusChange(apt, 'confirmado')} disabled={apt.status === 'confirmado' || apt.status === 'finalizado' || apt.status === 'cancelado'}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Confirmar
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleStatusChange(apt, 'finalizado')} disabled={apt.status === 'finalizado' || apt.status === 'cancelado'}>
                    <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                    Finalizar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange(apt, 'cancelado')} disabled={apt.status === 'cancelado' || apt.status === 'finalizado'}>
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

  const { data: paginatedAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  useEffect(() => {
    if (!firestore || !paginatedAppointments) return;

    const unviewedAppointments = paginatedAppointments.filter(apt => apt.viewedByAdmin === false);

    if (unviewedAppointments.length > 0) {
      const batch = writeBatch(firestore);
      unviewedAppointments.forEach(apt => {
        const appointmentRef = doc(firestore, 'appointments', apt.id);
        batch.update(appointmentRef, { viewedByAdmin: true });
      });
      batch.commit().catch(console.error);
    }
  }, [paginatedAppointments, firestore]);
  
  const handleNextPage = async () => {
    if (!paginatedAppointments || paginatedAppointments.length === 0 || !firestore) return;
    const lastVisible = await getDocs(query(collection(firestore, 'appointments'), where('id', '==', paginatedAppointments[paginatedAppointments.length - 1].id), limit(1)));
    
    if (lastVisible.docs[0]) {
        setPaginationSnapshots(prev => [...prev, lastVisible.docs[0]]);
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
