
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Edit, LogOut, Calendar, Bell } from 'lucide-react';
import type { Appointment, Service } from '@/lib/types';
import Link from 'next/link';
import { useUserData } from '@/hooks/use-user-data';

interface AppointmentWithService extends Appointment {
  serviceName?: string;
}

export default function ProfilePage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { userData, isLoading: isUserDataLoading } = useUserData();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Fetch services to map serviceId to serviceName
  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service, 'id'>>(servicesRef);

  const isAdmin = userData?.isAdmin ?? false;

  const appointmentsQuery = useMemoFirebase(() => {
    // CRITICAL: Wait until we know the user's admin status and have a uid
    if (isUserDataLoading || !user?.uid) return null;

    if (isAdmin) {
      // Admin can query all appointments (to be filtered later for their own profile view)
      return query(
        collection(firestore, 'appointments'),
        orderBy('startTime', 'desc')
      );
    } else {
      // Non-admin gets only their own appointments
      return query(
        collection(firestore, 'appointments'),
        where('clientId', '==', user.uid),
        orderBy('startTime', 'desc')
      );
    }
  }, [firestore, user?.uid, isAdmin, isUserDataLoading]);
  
  const { data: allAppointmentsData, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const upcomingAppointments = useMemo(() => {
    if (!allAppointmentsData || !services) return [];
    const now = new Date().toISOString();
    return allAppointmentsData
      .filter(apt => {
        // On profile page, EVERYONE (admin or not) should only see their OWN appointments.
        return apt.clientId === user?.uid && apt.startTime >= now;
      })
      .map(apt => ({
        ...apt,
        serviceName: services.find(s => s.id === apt.serviceId)?.name || 'Serviço Desconhecido',
      }))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allAppointmentsData, services, user?.uid]);
  
  const pastAppointments = useMemo(() => {
     if (!allAppointmentsData || !services) return [];
    const now = new Date().toISOString();
    return allAppointmentsData
      .filter(apt => {
         // On profile page, EVERYONE (admin or not) should only see their OWN appointments.
        return apt.clientId === user?.uid && apt.startTime < now;
      })
      .map(apt => ({
        ...apt,
        serviceName: services.find(s => s.id === apt.serviceId)?.name || 'Serviço Desconhecido',
      }));
  }, [allAppointmentsData, services, user?.uid]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao sair: ', error);
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

  const isLoading = isAuthLoading || isUserDataLoading;

  if (isLoading || !user) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader className="items-center text-center p-6">
                <Skeleton className="w-24 h-24 rounded-full mb-4" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-full mt-1" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <Skeleton className="h-8 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader className="items-center text-center p-6">
              <Avatar className="w-24 h-24 mb-4">
                {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'Usuário'} />}
                <AvatarFallback>
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="font-headline text-2xl">{user.displayName || 'Usuário'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" disabled>
                <Edit className="mr-2 h-4 w-4" />
                Editar Perfil
              </Button>
              <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Calendar className="text-primary" />
                Meus Próximos Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAppointments || isLoadingServices ? (
                <Skeleton className="h-20 w-full" />
              ) : upcomingAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <li key={apt.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-semibold">{apt.serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(apt.startTime), "EEEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                       <Badge variant={getBadgeVariant(apt.status)} className="capitalize">
                        {apt.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">Você não tem agendamentos futuros.</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Calendar className="text-primary" />
                Meus Agendamentos Passados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAppointments || isLoadingServices ? (
                 <Skeleton className="h-20 w-full" />
              ) : pastAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {pastAppointments.map((apt) => (
                    <li key={apt.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-semibold">{apt.serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(apt.startTime), "EEEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/book?service=${apt.serviceId}`}>Agendar Novamente</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">Você não tem agendamentos passados.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Bell className="text-primary" />
                Configurações de Notificação
              </CardTitle>
              <CardDescription>Gerencie como nos comunicamos com você.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="promo-notifications" className="flex flex-col gap-1">
                  <span className="font-semibold">Notificações Promocionais</span>
                  <span className="text-sm text-muted-foreground">Receba atualizações sobre ofertas especiais e novos serviços.</span>
                </Label>
                <Switch id="promo-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="reminder-notifications" className="flex flex-col gap-1">
                  <span className="font-semibold">Lembretes de Agendamento</span>
                   <span className="text-sm text-muted-foreground">Receba lembretes para seus próximos agendamentos.</span>
                </Label>
                <Switch id="reminder-notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    