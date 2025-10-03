
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
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { Appointment, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentsTableProps {
  services: (Omit<Service, 'id'> & { id: string })[];
}

function AppointmentsTable({ services }: AppointmentsTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const appointmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'appointments'), orderBy('startTime', 'desc')) : null),
    [firestore]
  );
  
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service || { name: 'Serviço não encontrado', price: 0 };
  };

  const handleStatusChange = (appointment: Appointment, newStatus: 'confirmed' | 'cancelled') => {
    if (!firestore || !appointment.id) return;
    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    updateDocumentNonBlocking(appointmentRef, { status: newStatus });
    toast({
      title: 'Status do Agendamento Atualizado!',
      description: `O agendamento foi marcado como ${newStatus === 'confirmed' ? 'confirmado' : 'cancelado'}.`,
    });
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
        {isLoadingAppointments &&
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
  )
}

export default function AdminAppointmentsPage() {
  const firestore = useFirestore();
  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Agendamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingServices ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : services ? (
          <AppointmentsTable services={services} />
        ) : (
           <p className="py-8 text-center text-muted-foreground">
            Não foi possível carregar os serviços necessários.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
