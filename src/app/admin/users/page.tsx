
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersRef);

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
                    <Skeleton className="h-6 w-[80px]" />
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
                  {user.isAdmin ? (
                    <Badge>Admin</Badge>
                  ) : (
                    <Badge variant="secondary">Usuário</Badge>
                  )}
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
    </Card>
  );
}

    