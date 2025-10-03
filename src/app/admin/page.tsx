'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Sparkles, Scissors, Gift } from 'lucide-react';
import type { Service, User, Promotion } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// This component now receives isAdmin as a prop from the layout
export default function AdminDashboardPage({ isAdmin }: { isAdmin: boolean }) {
  const firestore = useFirestore();

  // The layout already protects this route, so checking for isAdmin here was redundant
  // and causing a race condition where the query would be null on initial render.
  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const servicesRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const promotionsRef = useMemoFirebase(() => collection(firestore, 'promotions'), [firestore]);


  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service,'id'>>(servicesRef);
  const { data: promotions, isLoading: isLoadingPromotions } = useCollection<Omit<Promotion,'id'>>(promotionsRef);


  const totalUsers = users?.length || 0;
  const totalServices = services?.length || 0;
  const totalPromotions = promotions?.length || 0;


  const isLoading = isLoadingUsers || isLoadingServices || isLoadingPromotions;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Visão Geral</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </div>
  );
}
