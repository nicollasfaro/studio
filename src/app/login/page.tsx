'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Loader2 } from 'lucide-react';


const formSchema = z.object({
  email: z.string().email({ message: 'Endereço de e-mail inválido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
});

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        <path d="M1 1h22v22H1z" fill="none" />
    </svg>
);


export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isProcessingGoogleLogin, setIsProcessingGoogleLogin] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSuccessfulLogin = async (user: User, accessToken?: string) => {
    if (!firestore) throw new Error("Firestore not available");
    
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const userData: any = {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        providerId: user.providerData[0]?.providerId || 'google.com',
    };

    if (accessToken) {
        userData.googleAccessToken = accessToken;
    }
    
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        userData.createdAt = new Date().toISOString();
        userData.isAdmin = false;
    }
    
    try {
        await setDoc(userDocRef, userData, { merge: true });
    } catch (error) {
        console.error("Error writing user document:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: userDoc.exists() ? 'update' : 'create',
            requestResourceData: userData
        }));
        throw error;
    }
      
    const updatedUserDocSnap = await getDoc(userDocRef);
    const updatedUserDoc = updatedUserDocSnap.data();
      
    if (updatedUserDoc?.isAdmin) {
        router.push('/admin');
    } else {
        router.push('/');
    }

    toast({
        title: 'Login bem-sucedido',
        description: 'Bem-vindo(a) de volta!',
    });
  };

  const onEmailSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!auth) return;
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      console.error('Erro de login:', error);
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: 'E-mail ou senha incorretos. Por favor, tente novamente.',
      });
    }
  };

  const onGoogleSubmit = async () => {
    if (!auth) return;
    setIsProcessingGoogleLogin(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      await handleSuccessfulLogin(result.user, accessToken);
    } catch (error: any) {
        console.error('Error initiating Google login:', error);
        if (error.code !== 'auth/popup-closed-by-user') {
           toast({
            variant: 'destructive',
            title: 'Falha no login com Google',
            description: error.message || 'Não foi possível fazer o login. Tente novamente mais tarde.',
          });
        }
    } finally {
        setIsProcessingGoogleLogin(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4">
      {isProcessingGoogleLogin && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Processando login...</p>
          </div>
      )}
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Bem-vindo de Volta!</CardTitle>
          <CardDescription>Faça login para acessar sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="voce@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full font-bold" disabled={form.formState.isSubmitting || isProcessingGoogleLogin}>
                {form.formState.isSubmitting ? 'Entrando...' : 'Login'}
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={onGoogleSubmit} disabled={isProcessingGoogleLogin || form.formState.isSubmitting}>
            <GoogleIcon />
            <span className="ml-2">Entrar com o Google</span>
          </Button>

          <div className="mt-6 text-center text-sm">
            Não tem uma conta?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Registre-se aqui
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
