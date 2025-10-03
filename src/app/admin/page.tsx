
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Calendar, Sparkles, DollarSign } from 'lucide-react';
import type { Appointment, Service, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const firestore = useFirestore();

  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const appointmentsRef = useMemoFirebase(() => collectionGroup(firestore, 'appointments'), [firestore]);
  const servicesRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsRef);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service,'id'>>(servicesRef);

  const totalUsers = users?.length || 0;
  const totalAppointments = appointments?.length || 0;

  const totalRevenue = useMemoFirebase(() => {
    if (!appointments || !services) return 0;
    return appointments.reduce((acc, appointment) => {
      const service = services.find(s => s.id === appointment.serviceId);
      return acc + (service?.price || 0);
    }, 0);
  }, [appointments, services]);

  const isLoading = isLoadingUsers || isLoadingAppointments || isLoadingServices;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Visão Geral</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">R${totalRevenue.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">Receita total de agendamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{totalUsers}</div>}
            <p className="text-xs text-muted-foreground">Total de clientes registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{totalAppointments}</div>}
            <p className="text-xs text-muted-foreground">Agendamentos em todo o sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{services?.length || 0}</div>}
            <p className="text-xs text-muted-foreground">Número de serviços oferecidos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    