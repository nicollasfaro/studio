'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';

export function useAdmin() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc<UserType>(userDocRef);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loading = isAuthLoading || isUserDocLoading;
    setIsLoading(loading);

    if (loading) {
      return;
    }
    
    if (userData && userData.isAdmin) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }

  }, [userData, isAuthLoading, isUserDocLoading]);

  return { isAdmin, isLoading };
}
