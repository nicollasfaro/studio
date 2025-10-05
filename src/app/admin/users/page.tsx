
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy, limit, startAfter, getDocs, endBefore, limitToLast } from 'firebase/firestore';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';


const USERS_PER_PAGE = 10;

// This component now receives isAdmin as a prop from the layout
export default function AdminUsersPage({ isAdmin }: { isAdmin: boolean }) {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(USERS_PER_PAGE));
    if (page > 0 && lastVisible) {
      q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(USERS_PER_PAGE));
    }
    return q;
  }, [firestore, page, lastVisible]);
  
  const { data: users, isLoading } = useCollection<User>(usersQuery);

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
    }
  };

  const handleNextPage = async () => {
    if (!firestore || !users || users.length < USERS_PER_PAGE) return;
    
    const lastUser = users[users.length - 1];
    const lastUserDoc = await getDocs(query(collection(firestore, 'users'), where('id', '==', lastUser.id)));

    if (!lastUserDoc.empty) {
        const lastDocSnapshot = lastUserDoc.docs[0];
        setLastVisible(lastDocSnapshot);
        setFirstVisible(users[0]);
        setPage(prev => prev + 1);
    }
  };

  const handlePrevPage = async () => {
     if (!firestore || page === 0 || !firstVisible) return;

     const prevQuery = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), endBefore(firstVisible), limitToLast(USERS_PER_PAGE));
     const prevSnapshot = await getDocs(prevQuery);
     const prevUsers = prevSnapshot.docs.map(d => d.data() as User);

     if(prevUsers.length > 0) {
        setLastVisible(prevSnapshot.docs[prevSnapshot.docs.length-1]);
        setFirstVisible(prevSnapshot.docs[0]);
     } else {
        setFirstVisible(null);
        setLastVisible(null);
     }
     
     setPage(prev => prev - 1);
  };
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Usuários</CardTitle>
      </CardHeader>
      <CardContent>
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
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                </TableRow>
              ))}
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.isAdmin ? 'admin' : 'user'}
                    onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'user')}
                    disabled={user.id === currentUser?.uid}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!users || users.length < USERS_PER_PAGE}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
    </Card>
  );
}

    