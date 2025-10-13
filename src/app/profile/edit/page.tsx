
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import {
  useAuth,
  useUser,
  useFirestore,
  useFirebaseApp,
  useUserData,
  useMemoFirebase,
  useDoc,
} from '@/firebase';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Loader2, ArrowLeft } from 'lucide-react';

// --- Validation Schemas ---

const profileSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Email inválido.'),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'A senha atual é obrigatória.'),
  newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});


// --- Main Component ---

export default function EditProfilePage() {
  const { user, isUserLoading } = useUser();
  const { userData, isLoading: isUserDataLoading } = useUserData();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return <EditProfileSkeleton />;
  }

  if (!user || !userData) {
    return null; // or a more specific error/redirect component
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
       <Button variant="ghost" asChild className="mb-4">
        <Link href="/profile">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o Perfil
        </Link>
      </Button>
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Editar Perfil</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais, endereço e senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Perfil e Endereço</TabsTrigger>
                <TabsTrigger value="password">Segurança</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-6">
                <ProfileForm user={user} userData={userData} />
            </TabsContent>
             <TabsContent value="password" className="mt-6">
                <PasswordForm user={user} />
             </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Profile Form Component ---

function ProfileForm({ user, userData }: { user: NonNullable<ReturnType<typeof useUser>['user']>, userData: NonNullable<ReturnType<typeof useUserData>['userData']>}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = getStorage(useFirebaseApp());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(userData.photoURL || user.photoURL || null);
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userData.name || user.displayName || '',
      email: userData.email || user.email || '',
      street: userData.street || '',
      number: userData.number || '',
      complement: userData.complement || '',
      neighborhood: userData.neighborhood || '',
      city: userData.city || '',
      state: userData.state || '',
      zipCode: userData.zipCode || '',
      country: userData.country || 'Brasil',
    },
  });
  
  const watchedZipCode = useWatch({ control: form.control, name: 'zipCode' });

  useEffect(() => {
    const fetchAddress = async (zip: string) => {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
            const data = await response.json();
            if (!data.erro) {
                form.setValue('street', data.logradouro);
                form.setValue('neighborhood', data.bairro);
                form.setValue('city', data.localidade);
                form.setValue('state', data.uf);
                toast({ title: 'Endereço encontrado!', description: 'Os campos de endereço foram preenchidos.' });
            } else {
                toast({ title: 'CEP não encontrado', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Erro ao buscar CEP', description: 'Não foi possível consultar o endereço.', variant: 'destructive' });
        }
    };
    
    const plainZipCode = watchedZipCode?.replace(/\D/g, '');
    if (plainZipCode && plainZipCode.length === 8) {
        fetchAddress(plainZipCode);
    }
  }, [watchedZipCode, form, toast]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setNewPhotoDataUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    setIsSubmitting(true);
    try {
        let photoURL = user.photoURL;

        // 1. Upload new photo if it exists
        if (newPhotoDataUrl) {
            const imageRef = storageRef(storage, `profile-images/${user.uid}`);
            const snapshot = await uploadString(imageRef, newPhotoDataUrl, 'data_url');
            photoURL = await getDownloadURL(snapshot.ref);
        }

        // 2. Update Firebase Auth profile
        await updateProfile(user, {
            displayName: values.name,
            photoURL: photoURL,
        });

        // 3. Update Firestore document
        const userDocRef = doc(firestore, 'users', user.uid);
        const dataToUpdate = {
            ...values,
            photoURL: photoURL,
        };
        await setDoc(userDocRef, dataToUpdate, { merge: true });

        toast({
            title: "Perfil Atualizado!",
            description: "Suas informações foram salvas com sucesso.",
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        toast({
            variant: "destructive",
            title: "Erro ao atualizar",
            description: "Não foi possível salvar suas informações.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback><UserIcon className="w-12 h-12" /></AvatarFallback>
            </Avatar>
            <div className="grid gap-2">
                <FormLabel>Foto de Perfil</FormLabel>
                <Input type="file" accept="image/png, image/jpeg" onChange={handlePhotoChange} className="max-w-xs" />
                <p className="text-xs text-muted-foreground">PNG ou JPG, recomendado 1:1, até 2MB.</p>
            </div>
        </div>

        <Separator />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input {...field} disabled /></FormControl>
              <FormDescription>O email não pode ser alterado.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />
        
        <h3 className="text-lg font-medium">Endereço</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel>CEP</FormLabel>
                  <FormControl><Input placeholder="01310-100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>País</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rua</FormLabel>
              <FormControl><Input placeholder="Ex: Av. Paulista" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl><Input placeholder="900" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="complement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Apto 101" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl><Input placeholder="Bela Vista" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </form>
    </Form>
  );
}


// --- Password Form Component ---

function PasswordForm({ user }: { user: NonNullable<ReturnType<typeof useUser>['user']> }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
      setIsSubmitting(true);
      if (!user.email) {
          toast({ variant: "destructive", title: "Erro", description: "Email do usuário não encontrado." });
          setIsSubmitting(false);
          return;
      }
      try {
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, values.newPassword);
        
        toast({
            title: "Senha Alterada!",
            description: "Sua senha foi atualizada com sucesso.",
        });
        form.reset();

      } catch (error: any) {
        console.error("Password update error:", error);
        let description = "Ocorreu um erro ao alterar sua senha.";
        if (error.code === 'auth/wrong-password') {
            description = "A senha atual está incorreta. Tente novamente.";
        }
        toast({
            variant: "destructive",
            title: "Erro ao alterar senha",
            description: description,
        });
      } finally {
        setIsSubmitting(false);
      }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha Atual</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova Senha</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirme a Nova Senha</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Alterar Senha
        </Button>
      </form>
    </Form>
  )
}


// --- Skeleton Component ---

function EditProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="h-9 w-1/3" />
          <Skeleton className="h-5 w-2/3 mt-1" />
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="grid gap-2 flex-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 max-w-xs" />
                </div>
            </div>
             <Separator />
             <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
             <Separator />
             <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
             </div>
             <Skeleton className="h-10 w-36" />
        </CardContent>
      </Card>
    </div>
  );
}

    