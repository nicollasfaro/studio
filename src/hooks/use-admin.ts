'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';

// E-mail do administrador para desenvolvimento
const ADMIN_EMAIL = 'nicollasciuldin@gmail.com';

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

      // **Solução temporária para desenvolvimento**
      // Concede acesso de administrador ao e-mail especificado.
      if (user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
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
