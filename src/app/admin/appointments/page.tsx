
'use client';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { Appointment, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AppointmentWithService extends Appointment {
  serviceName?: string;
  servicePrice?: number;
}

export default function AdminAppointmentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const appointmentsQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'appointments'), orderBy('startTime', 'desc')) : null),
    [firestore]
  );
  
  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service, 'id'>>(servicesRef);

  const isLoading = isLoadingAppointments || isLoadingServices;

  const getServiceDetails = (serviceId: string) => {
    if (!services) return { name: 'Carregando...', price: 0 };
    const service = services.find(s => s.id === serviceId);
    return service || { name: 'Serviço não encontrado', price: 0 };
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: 'confirmed' | 'cancelled') => {
    if (!firestore || !appointment.clientId || !appointment.id) return;
    const appointmentRef = doc(firestore, 'users', appointment.clientId, 'appointments', appointment.id);
    try {
      await updateDoc(appointmentRef, { status: newStatus });
      toast({
        title: 'Status do Agendamento Atualizado!',
        description: `O agendamento foi marcado como ${newStatus === 'confirmed' ? 'confirmado' : 'cancelado'}.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: 'destructive',
        title: 'Erro!',
        description: 'Não foi possível atualizar o status do agendamento.',
      });
    }
  };
  
  const getBadgeVariant = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Agendamentos</CardTitle>
      </CardHeader>
      <CardContent>
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
            {appointments?.map((apt) => (
              <TableRow key={apt.id}>
                <TableCell>
                  <div className="font-medium">{apt.clientName}</div>
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
                      <DropdownMenuItem onClick={() => handleStatusChange(apt, 'confirmed')} disabled={apt.status === 'confirmed'}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Confirmar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(apt, 'cancelled')} disabled={apt.status === 'cancelled'}>
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
        {!isLoading && appointments?.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            Nenhum agendamento encontrado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
