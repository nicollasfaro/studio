
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, where, query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Scissors, Gift, DollarSign } from 'lucide-react';
import type { Service, User, Promotion, Appointment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// This component now receives isAdmin as a prop from the layout
export default function AdminDashboardPage({ isAdmin }: { isAdmin: boolean }) {
  const firestore = useFirestore();

  // The layout already protects this route, so checking for isAdmin here was redundant
  // and causing a race condition where the query would be null on initial render.
  const usersRef = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const promotionsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'promotions') : null), [firestore]);
  const appointmentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'appointments') : null), [firestore]);


  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service,'id'>>(servicesRef);
  const { data: promotions, isLoading: isLoadingPromotions } = useCollection<Omit<Promotion,'id'>>(promotionsRef);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsRef);


  const totalUsers = users?.length || 0;
  const totalServices = services?.length || 0;
  const totalPromotions = promotions?.length || 0;
  
  const confirmedRevenue = useMemo(() => {
    if (!appointments) return 0;
    return appointments
      .filter(apt => apt.status === 'confirmado')
      .reduce((sum, apt) => sum + (apt.finalPrice || 0), 0);
  }, [appointments]);


  const isLoading = isLoadingUsers || isLoadingServices || isLoadingPromotions || isLoadingAppointments;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Visão Geral</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{totalUsers}</div>}
            <p className="text-xs text-muted-foreground">Total de clientes registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingServices ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{totalServices}</div>}
            <p className="text-xs text-muted-foreground">Número de serviços oferecidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promoções Ativas</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingPromotions ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{totalPromotions}</div>}
            <p className="text-xs text-muted-foreground">Número de promoções ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Confirmada</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAppointments ? <Skeleton className="h-8 w-1/2"/> : (
                <div className="text-2xl font-bold">
                    {confirmedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            )}
            <p className="text-xs text-muted-foreground">Soma dos agendamentos confirmados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
