
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';

export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<AppUser>(userDocRef);

  const isAdmin = userData?.isAdmin ?? false;
  const isLoading = isUserLoading || isUserDataLoading;

  return { isAdmin, isLoading };
}

    