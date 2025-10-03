'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, Users, Calendar, Percent } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query } from "firebase/firestore";
import type { Appointment, Service, Promotion, User } from "@/lib/types";

export default function AdminDashboardPage() {
  const firestore = useFirestore();

  const appointmentsQuery = useMemoFirebase(() => query(collectionGroup(firestore, 'appointments')), [firestore]);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const servicesRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service, 'id'>>(servicesRef);

  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<Omit<User, 'id'>>(usersRef);
  
  const promotionsRef = useMemoFirebase(() => collection(firestore, 'promotions'), [firestore]);
  const { data: promotions, isLoading: isLoadingPromotions } = useCollection<Omit<Promotion, 'id'>>(promotionsRef);

  const isLoading = isLoadingAppointments || isLoadingServices || isLoadingUsers || isLoadingPromotions;

  const totalRevenue = appointments?.reduce((acc, appointment) => {
    const service = services?.find(s => s.id === appointment.serviceId);
    return acc + (service?.price || 0);
  }, 0) || 0;

  const totalAppointments = appointments?.length || 0;
  const totalUsers = users?.length || 0;
  const activePromotions = promotions?.length || 0;

  if (isLoading) {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Painel do Administrador</h1>
            <p>Carregando dados...</p>
        </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Painel do Administrador</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Com base nos agendamentos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
             <p className="text-xs text-muted-foreground">
              Usuários registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments}</div>
             <p className="text-xs text-muted-foreground">
              Agendamentos realizados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Promoções Ativas
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePromotions}</div>
            <p className="text-xs text-muted-foreground">
              Disponíveis no site
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
