

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarInset, SidebarMenuBadge, useSidebar } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LayoutDashboard, Users, Calendar, Scissors, Gift, Palette, Share2, Bell, Image, Home, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserData } from '@/hooks/use-user-data';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Appointment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import Link from 'next/link';


function AdminSidebarMenu() {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const firestore = useFirestore();
  const { userData } = useUserData();
  const isAdmin = userData?.isAdmin ?? false;

  const newAppointmentsQuery = useMemoFirebase(
    () => (firestore && isAdmin ? query(collection(firestore, 'appointments'), where('viewedByAdmin', '==', false)) : null),
    [firestore, isAdmin]
  );
  const { data: newAppointments } = useCollection<Appointment>(newAppointmentsQuery);
  const newAppointmentsCount = newAppointments?.length || 0;

  const handleMenuItemClick = () => {
    setOpenMobile(false);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin" leftIcon={<LayoutDashboard />} onClick={handleMenuItemClick}>
          Dashboard
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/banner" leftIcon={<Home />} onClick={handleMenuItemClick}>
          Banner
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/users" leftIcon={<Users />} onClick={handleMenuItemClick}>
          Usuários
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/appointments" leftIcon={<Calendar />} onClick={handleMenuItemClick}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span>Agendamentos</span>
            {newAppointmentsCount > 0 && pathname !== '/admin/appointments' && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {newAppointmentsCount}
                </span>
            )}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/schedule" leftIcon={<Clock />} onClick={handleMenuItemClick}>
          Horários
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton href="/admin/location" leftIcon={<MapPin />} onClick={handleMenuItemClick}>
          Localização
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/services" leftIcon={<Scissors />} onClick={handleMenuItemClick}>
          Serviços
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/promotions" leftIcon={<Gift />} onClick={handleMenuItemClick}>
          Promoções
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/gallery" leftIcon={<Image />} onClick={handleMenuItemClick}>
          Galeria
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/theme" leftIcon={<Palette />} onClick={handleMenuItemClick}>
          Tema
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/social" leftIcon={<Share2 />} onClick={handleMenuItemClick}>
          Redes Sociais
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton href="/admin/notifications" leftIcon={<Bell />} onClick={handleMenuItemClick}>
          Notificações
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { userData, isLoading } = useUserData();
  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userData?.isAdmin ?? false;

  const newAppointmentsQuery = useMemoFirebase(
    () => (firestore && isAdmin ? query(collection(firestore, 'appointments'), where('viewedByAdmin', '==', false)) : null),
    [firestore, isAdmin]
  );
  const { data: newAppointments } = useCollection<Appointment>(newAppointmentsQuery);
  const newAppointmentsCount = newAppointments?.length || 0;

  // Use a ref to track the previous count of new appointments
  const prevAppointmentsCountRef = useRef(newAppointmentsCount);

  useEffect(() => {
    // When the component mounts, sync the ref
    if (prevAppointmentsCountRef.current === undefined) {
      prevAppointmentsCountRef.current = newAppointmentsCount;
      return;
    }

    // If the new count is greater than the previous one, it means a new appointment has arrived.
    if (newAppointmentsCount > prevAppointmentsCountRef.current) {
      toast({
        title: 'Novo Agendamento!',
        description: `Você recebeu um novo agendamento de ${newAppointments?.[newAppointments.length - 1]?.clientName || 'um cliente'}.`,
        action: (
          <ToastAction altText="Conferir" asChild>
            <Link href="/admin/appointments">Conferir</Link>
          </ToastAction>
        ),
        duration: 10000,
      });
    }

    // Update the ref with the current count for the next check.
    prevAppointmentsCountRef.current = newAppointmentsCount;

  }, [newAppointmentsCount, newAppointments, toast]);


  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
                 <p className="text-muted-foreground">Verificando suas credenciais de administrador...</p>
            </div>
        </div>
    );
  }

  if (!isAdmin) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Acesso Negado</h1>
                <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
                <Button onClick={() => router.push('/')} className="mt-4">Voltar para a Home</Button>
            </div>
        </div>
    )
  }

  // Clone children to pass down isAdmin prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // @ts-ignore
      return React.cloneElement(child, { isAdmin });
    }
    return child;
  });

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <AdminSidebarMenu />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Painel de Administração</h1>
        </header>
        <main className="p-8">
            {childrenWithProps}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    