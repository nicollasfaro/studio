'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Edit, LogOut, Calendar, Bell, MoreVertical, Trash2, Repeat, AlertCircle, Check, X } from 'lucide-react';
import type { Appointment, Service } from '@/lib/types';
import Link from 'next/link';
import { useUserData } from '@/hooks/use-user-data';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import NotificationSubscriber from '@/components/NotificationSubscriber';

interface AppointmentWithService extends Appointment {
  serviceName?: string;
  service?: Service;
}

export default function ProfilePage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { userData, isLoading: isUserDataLoading } = useUserData();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const servicesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesRef);

  const appointmentsQuery = useMemoFirebase(() => {
    if (isUserDataLoading || !firestore || !user?.uid) {
      return null;
    }
    return query(collection(firestore, 'appointments'), where('clientId', '==', user.uid));
  }, [firestore, user?.uid, isUserDataLoading]);
  
  const { data: allUserAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const appointmentsWithServices = useMemo<AppointmentWithService[]>(() => {
    if (!allUserAppointments || !services) return [];
    return allUserAppointments.map(apt => ({
      ...apt,
      service: services.find(s => s.id === apt.serviceId),
      serviceName: services.find(s => s.id === apt.serviceId)?.name || 'Serviço Desconhecido',
    }));
  }, [allUserAppointments, services]);
  
  const upcomingAppointments = appointmentsWithServices
    .filter(apt => new Date(apt.startTime) >= new Date() && apt.status !== 'cancelado')
    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  const pastAppointments = appointmentsWithServices
    .filter(apt => new Date(apt.startTime) < new Date() || apt.status === 'cancelado')
    .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao sair: ', error);
    }
  };

  const handleCancelAppointment = (appointment: Appointment | null) => {
    if (!appointment || !firestore) return;

    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    updateDoc(appointmentRef, { status: 'cancelado' }).then(() => {
      toast({
        title: 'Agendamento Cancelado',
        description: 'Seu agendamento foi cancelado com sucesso.',
      });
      setAppointmentToCancel(null);
    }).catch(error => {
      toast({
        variant: 'destructive',
        title: 'Erro ao Cancelar',
        description: 'Não foi possível cancelar o agendamento.',
      });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: appointmentRef.path,
        operation: 'update',
        requestResourceData: { status: 'cancelado' },
      }));
    });
  };

  const handleContestResponse = (appointment: Appointment, accepted: boolean) => {
    if (!firestore) return;
    const appointmentRef = doc(firestore, 'appointments', appointment.id);
    
    let updateData = {};
    if (accepted) {
      updateData = {
        status: 'Marcado',
        contestStatus: 'accepted',
        finalPrice: appointment.contestedPrice,
        hairLength: appointment.contestedHairLength,
      };
    } else {
      updateData = {
        status: 'cancelado',
        contestStatus: 'rejected',
      };
    }

    updateDoc(appointmentRef, updateData).then(() => {
      toast({
        title: 'Resposta Enviada!',
        description: `Sua resposta à contestação foi registrada.`,
      });
    }).catch(error => {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível processar sua resposta.' });
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
      case 'contestado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const isLoading = isAuthLoading || isUserDataLoading;
  const userPhoto = userData?.photoURL || user?.photoURL;

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
                {userPhoto && <AvatarImage src={userPhoto} alt={user.displayName || 'Usuário'} />}
                <AvatarFallback>
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="font-headline text-2xl">{userData?.name || user.displayName || 'Usuário'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/profile/edit">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Link>
              </Button>
              <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Calendar className="text-primary" />
                  Meus Próximos Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingServices || isLoadingAppointments ? (
                  <Skeleton className="h-20 w-full" />
                ) : upcomingAppointments.length > 0 ? (
                  <ul className="space-y-4">
                    {upcomingAppointments.map((apt) => (
                      <li key={apt.id} className="p-4 bg-secondary/30 rounded-lg">
                         {apt.contestStatus === 'pending' && (
                            <Alert variant="destructive" className="mb-4 bg-amber-50 border-amber-200">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <AlertTitle className="text-amber-800 font-semibold">Contestação de Valor</AlertTitle>
                              <AlertDescription className="text-amber-700">
                                O salão contestou o valor do seu agendamento.
                                <p className="mt-2 font-semibold">Motivo: <span className="font-normal">{apt.contestReason}</span></p>
                                <p className="font-semibold">Novo Valor Proposto: <span className="font-normal">R${apt.contestedPrice?.toFixed(2)}</span></p>
                                 <div className="flex gap-2 mt-3">
                                  <Button size="sm" onClick={() => handleContestResponse(apt, true)}><Check className="mr-1 h-4 w-4"/> Aceitar Novo Valor</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleContestResponse(apt, false)}><X className="mr-1 h-4 w-4" /> Recusar e Cancelar</Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                         )}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{apt.serviceName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(apt.startTime), "EEEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                             <Badge variant={getBadgeVariant(apt.status)} className="capitalize mt-2">
                              {apt.status === 'contestado' ? 'Contestado' : apt.status}
                            </Badge>
                          </div>
                          {apt.status !== 'contestado' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild disabled={apt.status !== 'Marcado'}>
                                  <Link href={`/book?remarcarId=${apt.id}`}>
                                    <Repeat className="mr-2 h-4 w-4" />
                                    Remarcar
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAppointmentToCancel(apt)} className="text-destructive focus:text-destructive" disabled={apt.status !== 'Marcado'}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
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
                  Histórico de Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingServices || isLoadingAppointments ? (
                   <Skeleton className="h-20 w-full" />
                ) : pastAppointments.length > 0 ? (
                  <ul className="space-y-4">
                    {pastAppointments.map((apt) => (
                      <li key={apt.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="font-semibold">{apt.serviceName}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(apt.startTime), "d 'de' MMM, yyyy", { locale: ptBR })} - <Badge variant={getBadgeVariant(apt.status)} className="capitalize">{apt.status}</Badge>
                          </p>
                        </div>
                         {apt.status !== 'cancelado' && (
                            <Button asChild variant="secondary" size="sm">
                                <Link href={`/book?service=${apt.serviceId}`}>Agendar Novamente</Link>
                            </Button>
                         )}
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
                    <NotificationSubscriber
                        feature="promotional"
                        title="Notificações Promocionais"
                        description="Receba atualizações sobre ofertas especiais e novos serviços."
                    />
                    <NotificationSubscriber
                        feature="reminders"
                        title="Lembretes de Agendamento"
                        description="Receba lembretes para seus próximos agendamentos."
                    />
                </CardContent>
            </Card>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso cancelará permanentemente seu agendamento para o serviço "{appointmentToCancel?.serviceName}" no dia {appointmentToCancel && format(new Date(appointmentToCancel.startTime), "dd/MM/yyyy 'às' HH:mm")}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setAppointmentToCancel(null)}>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleCancelAppointment(appointmentToCancel)} className="bg-destructive hover:bg-destructive/90">Sim, cancelar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
