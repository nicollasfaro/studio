
'use client';

import React, { useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface ThemeSettings {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  
  // Memoize the document reference to prevent re-fetching on every render.
  const themeDocRef = useMemoFirebase(() => {
    // Wait until firestore is available
    if (!firestore) return null;
    return doc(firestore, 'theme', 'global');
  }, [firestore]);

  // Fetch theme data from Firestore using the useDoc hook.
  const { data: themeData, isLoading } = useDoc<ThemeSettings>(themeDocRef);

  useEffect(() => {
    if (themeData) {
      const root = document.documentElement;
      // Dynamically set CSS variables based on fetched theme data.
      root.style.setProperty('--primary-hsl', themeData.primary);
      root.style.setProperty('--secondary-hsl', themeData.secondary);
      root.style.setProperty('--accent-hsl', themeData.accent);
      root.style.setProperty('--background-hsl', themeData.background);
    }
  }, [themeData]); // Re-run this effect only when themeData changes.

  // While loading, we can render children with default styles, or a loading skeleton.
  // For simplicity, we render children directly. The transition should be fast.
  return <>{children}</>;
}
