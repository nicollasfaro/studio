
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Scissors,
  Gift,
  Calendar,
  User,
  Home,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';

const navLinks = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/services', label: 'Serviços', icon: Scissors },
  { href: '/promotions', label: 'Promoções', icon: Gift },
  { href: '/book', label: 'Agendar', icon: Calendar },
];

export function Header() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { isAdmin } = useAdmin();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Logout bem-sucedido',
      });
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout: ', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer logout',
        description: 'Por favor, tente novamente.',
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-primary shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Alternar menu de navegação</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-background">
              <nav className="grid gap-6 text-lg font-medium mt-10">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
                      pathname === href && 'text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Logo />
        </div>
        <nav className="hidden md:flex md:items-center md:gap-6 text-sm font-medium">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'transition-colors hover:text-accent text-primary-foreground/80',
                pathname === href ? 'text-white font-semibold' : ''
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User profile'} />}
                <AvatarFallback>
                  <User className="text-primary" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              {user ? user.displayName || 'Minha Conta' : 'Convidado'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isUserLoading ? (
              <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
            ) : user ? (
              <>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Painel de Admin</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Meus Agendamentos</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Login</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Registrar</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

    