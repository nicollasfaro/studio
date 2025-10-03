
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarInset } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LayoutDashboard, Users, Calendar, Scissors, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserData } from '@/hooks/use-user-data';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { userData, isLoading } = useUserData();

  const isAdmin = userData?.isAdmin ?? false;

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
            {childrenWithProps}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
