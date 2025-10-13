
'use client';

import React, { createContext, useContext } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { BusinessInfo } from '@/lib/types';

interface BusinessInfoContextType {
  info: BusinessInfo | null;
  isLoading: boolean;
}

const BusinessInfoContext = createContext<BusinessInfoContextType>({
  info: null,
  isLoading: true,
});

export function BusinessInfoProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const infoDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'businessInfo') : null), [firestore]);
  const { data: info, isLoading } = useDoc<BusinessInfo>(infoDocRef);

  return (
    <BusinessInfoContext.Provider value={{ info, isLoading }}>
      {children}
    </BusinessInfoContext.Provider>
  );
}

export const useBusinessInfo = () => {
  return useContext(BusinessInfoContext);
};

    