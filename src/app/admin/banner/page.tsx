
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { GalleryImage, HeroBanner } from '@/lib/types';
import { collection } from 'firebase/firestore';

const heroBannerSchema = z.object({
  imageId: z.string().min(1, 'Por favor, selecione uma imagem.'),
  largeText: z.string().min(5, 'O texto principal deve ter pelo menos 5 caracteres.'),
  smallText: z.string().min(10, 'O texto de apoio deve ter pelo menos 10 caracteres.'),
  buttonText: z.string().min(3, 'O texto do botão deve ter pelo menos 3 caracteres.'),
});

type HeroBannerFormValues = z.infer<typeof heroBannerSchema>;

export default function AdminBannerPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const heroDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'content', 'heroBanner') : null), [firestore]);
  const { data: heroData, isLoading: isHeroLoading } = useDoc<HeroBannerFormValues>(heroDocRef);
  
  const galleryImagesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'galleryImages') : null), [firestore]);
  const { data: galleryImages, isLoading: isLoadingGallery } = useCollection<GalleryImage>(galleryImagesRef);


  const form = useForm<HeroBannerFormValues>({
    resolver: zodResolver(heroBannerSchema),
    defaultValues: {
      imageId: '',
      largeText: '',
      smallText: '',
      buttonText: 'Agende um Horário',
    },
  });

  useEffect(() => {
    if (heroData) {
      form.reset(heroData);
    }
  }, [heroData, form]);

  const onSubmit = (values: HeroBannerFormValues) => {
    if (!heroDocRef) return;

    setDoc(heroDocRef, values, { merge: true }).then(() => {
      toast({
        title: 'Banner Atualizado!',
        description: 'O banner da página inicial foi salvo com sucesso.',
      });
    }).catch(error => {
      console.error('Erro ao salvar o banner:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as informações do banner.',
      });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: heroDocRef.path,
        operation: 'update',
        requestResourceData: values,
      }));
    });
  };
  
  const isLoading = isHeroLoading || isLoadingGallery;

  if (isLoading) {
      return (
          <Card className="max-w-2xl">
              <CardHeader>
                  <CardTitle>Personalizar Banner da Home</CardTitle>
                  <CardDescription>Edite o conteúdo do banner principal do seu site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-24 w-full" />
                   <Skeleton className="h-12 w-full" />
              </CardContent>
              <CardFooter>
                   <Skeleton className="h-10 w-24" />
              </CardFooter>
          </Card>
      )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Personalizar Banner da Home</CardTitle>
        <CardDescription>
          Edite o conteúdo do banner principal que aparece na página inicial do seu site.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="imageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem de Fundo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingGallery}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingGallery ? "Carregando imagens..." : "Selecione uma imagem da galeria"} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {galleryImages?.map((img) => (
                        <SelectItem key={img.id} value={img.id}>{img.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="largeText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto Principal (Grande)</FormLabel>
                  <FormControl>
                    <Input placeholder="Experimente o Verdadeiro Glamour" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smallText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto de Apoio (Pequeno)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mime-se com nossos tratamentos de beleza..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buttonText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto do Botão</FormLabel>
                  <FormControl>
                    <Input placeholder="Agende um Horário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Banner
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    