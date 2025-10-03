
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarInset } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LayoutDashboard, Users, Calendar, Scissors, Gift } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, isLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
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
              <SidebarMenuButton href="/admin/users" leftIcon={<Users />}>
                Usuários
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/appointments" leftIcon={<Calendar />}>
                Agendamentos
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
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Painel de Administração</h1>
        </header>
        <main className="p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    