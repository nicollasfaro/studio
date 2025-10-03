
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';

/**
 * A centralized hook to fetch the current user's profile data from Firestore.
 * This prevents multiple, simultaneous fetches for the same data across different components.
 * @returns An object containing the user's profile data (`userData`) and the loading state (`isLoading`).
 */
export function useUserData() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Create a memoized reference to the user's document.
  // This ref only changes if the user's UID or the firestore instance changes.
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  // Use the useDoc hook to fetch the document data.
  const { data: userData, isLoading: isDocLoading, error } = useDoc<AppUser>(userDocRef);

  // If there's an error fetching the document, log it.
  if (error) {
    console.error("Error fetching user data:", error);
  }
  
  // The overall loading state is true if either the auth state is loading or the document is loading.
  const isLoading = isAuthLoading || (user && isDocLoading);

  return { userData, isLoading };
}
