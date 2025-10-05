
'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
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
import { MoreHorizontal, CheckCircle, XCircle, Camera } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { Appointment, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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
          <TableRow key={apt.id}>
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
                            layout="fill"
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
  
  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesRef);

  const appointmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'appointments'), orderBy('startTime', 'desc')) : null),
    [firestore]
  );
  
  const { data: allAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  
  const filteredAppointments = useMemo(() => {
    if (!allAppointments) return [];
    const now = new Date();
    switch (filter) {
        case 'upcoming':
            return allAppointments.filter(apt => new Date(apt.startTime) >= now && (apt.status === 'Marcado' || apt.status === 'confirmado'));
        case 'history':
            return allAppointments.filter(apt => new Date(apt.startTime) < now || apt.status === 'finalizado' || apt.status === 'cancelado');
        case 'all':
        default:
            return allAppointments;
    }
  }, [allAppointments, filter]);

  const isLoading = isLoadingServices || isLoadingAppointments;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Gerenciamento de Agendamentos</CardTitle>
        <Tabs defaultValue={filter} onValueChange={setFilter} className="w-auto">
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
          <AppointmentsTable services={services} appointments={filteredAppointments} isLoading={isLoadingAppointments} />
        ) : (
           <p className="py-8 text-center text-muted-foreground">
            Não foi possível carregar os serviços necessários.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
