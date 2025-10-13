
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const USERS_PER_PAGE = 10;

function UsersTable({ users, currentUser, handleRoleChange, updatingRoleId, isLoading }: any) {
  const renderRoleSelector = (user: User) => {
    const isUpdating = updatingRoleId === user.id;
    return (
        <div className='flex items-center gap-2'>
            <Select
                defaultValue={user.isAdmin ? 'admin' : 'user'}
                onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'user')}
                disabled={user.id === currentUser?.uid || isUpdating}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
            </Select>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
    );
  };
  
  const isMobile = useIsMobile();
  
  if (isLoading) {
    return Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-4" />);
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        {users?.map((user: User) => (
            <Card key={user.id} className="p-4">
                <div className="flex flex-col space-y-2">
                    <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium">Função</p>
                        {renderRoleSelector(user)}
                    </div>
                    <div>
                        <p className="text-sm font-medium">Data de Criação</p>
                        <p className="text-sm text-muted-foreground">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>
            </Card>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Função</TableHead>
          <TableHead>Data de Criação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users?.map((user: User) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{renderRoleSelector(user)}</TableCell>
            <TableCell>
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : 'N/A'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// This component now receives isAdmin as a prop from the layout
export default function AdminUsersPage({ isAdmin }: { isAdmin: boolean }) {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [paginationSnapshots, setPaginationSnapshots] = useState<(DocumentSnapshot | null)[]>([null]);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);


  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
    
    if (page > 0 && paginationSnapshots[page]) {
      return query(q, startAfter(paginationSnapshots[page]), limit(USERS_PER_PAGE));
    }
    
    return query(q, limit(USERS_PER_PAGE));
  }, [firestore, page, paginationSnapshots]);
  
  const { data: users, isLoading, snapshots } = useCollection<User>(usersQuery);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    if (!firestore) return;
    if (userId === currentUser?.uid) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode alterar sua própria função.',
      });
      return;
    }

    setUpdatingRoleId(userId);
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userDocRef, {
        isAdmin: newRole === 'admin',
      });
      toast({
        title: 'Função atualizada!',
        description: `O usuário agora é um ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar a função:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar a função do usuário. Verifique suas permissões.',
      });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleNextPage = () => {
    if (!snapshots || snapshots.length === 0 || snapshots.length < USERS_PER_PAGE) return;

    const lastVisible = snapshots[snapshots.length - 1];
    if (lastVisible) {
        setPaginationSnapshots(prev => [...prev, lastVisible]);
        setPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page === 0) return;
    setPage(prev => prev - 1);
    setPaginationSnapshots(prev => prev.slice(0, -1));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <UsersTable
          users={users}
          currentUser={currentUser}
          handleRoleChange={handleRoleChange}
          updatingRoleId={updatingRoleId}
          isLoading={isLoading}
        />
       
        {!isLoading && users?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum usuário encontrado.
          </p>
        )}
      </CardContent>
       <CardFooter className="flex items-center justify-end space-x-2 py-4">
          <span className="text-sm text-muted-foreground">
            Página {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!users || users.length < USERS_PER_PAGE || isLoading}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
    </Card>
  );
}

    