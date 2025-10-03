'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';

export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isUserLoading) {
        return;
      }
      
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        const isAdminClaim = !!idTokenResult.claims.admin;
        setIsAdmin(isAdminClaim);
      } catch (error) {
        console.error("Erro ao verificar o status de administrador:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, isUserLoading]);

  return { isAdmin, isLoading };
}
