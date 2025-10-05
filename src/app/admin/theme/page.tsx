
'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

// --- Funções de Conversão de Cor ---
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length == 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length == 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin;
  let h = 0, s = 0, l = 0;
  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(0);
  l = +(l * 100).toFixed(0);
  return `${h} ${s}% ${l}%`;
}


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
      setDocumentNonBlocking(themeDocRef, values, { merge: false });
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
    const colorInputRef = useRef<HTMLInputElement>(null);

    const [h, s, l] = value.split(' ').map(v => parseInt(v.replace('%', '')));
    const hexValue = hslToHex(h,s,l);

    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-4">
               <div
                className="h-10 w-10 rounded-md border cursor-pointer"
                style={{ backgroundColor: `hsl(${value})` }}
                onClick={() => colorInputRef.current?.click()}
              />
              <FormControl>
                <input
                    type="color"
                    value={hexValue}
                    onChange={(e) => field.onChange(hexToHsl(e.target.value))}
                    ref={colorInputRef}
                    className="absolute opacity-0 w-0 h-0"
                 />
              </FormControl>
               <span className="text-sm text-muted-foreground font-mono">{`hsl(${value})`}</span>
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
