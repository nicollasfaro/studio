
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';

// This hook is now simplified and may not be strictly necessary,
// but we keep it for consistency in case we want to add more complex
// admin-related logic later.
// It no longer fetches data but relies on the isAdmin prop passed down from the layout.
export function useAdmin(isAdmin: boolean) {
  const { isUserLoading } = useUser();
  
  // The primary loading state is now just the user authentication state.
  // Data fetching state is handled by the layout.
  const isLoading = isUserLoading;

  return { isAdmin, isLoading };
}
