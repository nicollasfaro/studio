
'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarInset, SidebarMenuBadge } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LayoutDashboard, Users, Calendar, Scissors, Gift, Palette, Share2, Bell, Image, Home, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserData } from '@/hooks/use-user-data';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Appointment } from '@/lib/types';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { userData, isLoading } = useUserData();
  const firestore = useFirestore();

  const isAdmin = userData?.isAdmin ?? false;

  const newAppointmentsQuery = useMemoFirebase(
    () => (firestore && isAdmin ? query(collection(firestore, 'appointments'), where('viewedByAdmin', '==', false)) : null),
    [firestore, isAdmin]
  );
  const { data: newAppointments } = useCollection<Appointment>(newAppointmentsQuery);
  const newAppointmentsCount = newAppointments?.length || 0;


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
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin" leftIcon={<LayoutDashboard />}>
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/banner" leftIcon={<Home />}>
                Banner
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/users" leftIcon={<Users />}>
                Usuários
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/appointments" leftIcon={<Calendar />}>
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
              <SidebarMenuButton href="/admin/schedule" leftIcon={<Clock />}>
                Horários
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/admin/services" leftIcon={<Scissors />}>
                Serviços
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/admin/promotions" leftIcon={<Gift />}>
                Promoções
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/admin/gallery" leftIcon={<Image />}>
                Galeria
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/theme" leftIcon={<Palette />}>
                Tema
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/admin/social" leftIcon={<Share2 />}>
                Redes Sociais
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/notifications" leftIcon={<Bell />}>
                Notificações
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
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
