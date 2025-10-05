
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// HSL color string validation
const hslRegex = /^(\d{1,3})\s(\d{1,3})%\s(\d{1,3})%$/;
const hslColorSchema = z.string().regex(hslRegex, 'Formato de cor inválido. Use: H S L (ex: 240 10% 50%)');

const themeSchema = z.object({
  primary: hslColorSchema,
  secondary: hslColorSchema,
  accent: hslColorSchema,
});

type ThemeFormValues = z.infer<typeof themeSchema>;

export default function AdminThemePage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const themeDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'theme', 'global') : null), [firestore]);
  const { data: themeData, isLoading: isThemeLoading } = useDoc<ThemeFormValues>(themeDocRef);
  
  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      primary: '271 76% 34%',
      secondary: '271 50% 80%',
      accent: '330 100% 71%',
    },
  });

  useEffect(() => {
    if (themeData) {
      form.reset(themeData);
    }
  }, [themeData, form]);

  const onSubmit = async (values: ThemeFormValues) => {
    if (!themeDocRef) return;

    try {
      await setDocumentNonBlocking(themeDocRef, values, { merge: false });
      toast({
        title: 'Tema Atualizado!',
        description: 'O novo tema foi salvo e será aplicado em todo o site.',
      });
      // A aplicação irá recarregar o tema dinamicamente
    } catch (error) {
      console.error('Erro ao salvar o tema:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações de tema.',
      });
    }
  };

  const ColorPickerField = ({ name, label }: { name: keyof ThemeFormValues, label: string }) => {
    const value = form.watch(name);
    // This is a simple text input for HSL values, not a fancy color picker.
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-4">
              <FormControl>
                <Input placeholder="H S L (ex: 240 10% 50%)" {...field} />
              </FormControl>
              <div
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: `hsl(${value})` }}
              />
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };
  
  if (isThemeLoading) {
    return (
        <Card>
            <CardHeader><CardTitle>Customizar Tema</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
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
        <CardTitle>Customizar Tema</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <ColorPickerField name="primary" label="Cor Primária" />
            <ColorPickerField name="secondary" label="Cor Secundária" />
            <ColorPickerField name="accent" label="Cor de Destaque (Accent)" />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Tema
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
