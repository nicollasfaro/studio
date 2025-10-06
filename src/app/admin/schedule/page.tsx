
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { BusinessHours } from '@/lib/types';

const timeSlots = Array.from({ length: 24 * 2 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

const daysOfWeek = [
    { id: 1, label: 'Segunda-feira' },
    { id: 2, label: 'Terça-feira' },
    { id: 3, label: 'Quarta-feira' },
    { id: 4, label: 'Quinta-feira' },
    { id: 5, label: 'Sexta-feira' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
];

const scheduleSchema = z.object({
  startTime: z.string().min(1, 'Selecione um horário de início.'),
  endTime: z.string().min(1, 'Selecione um horário de término.'),
  workingDays: z.array(z.number()).min(1, 'Selecione pelo menos um dia de funcionamento.'),
}).refine(data => data.startTime < data.endTime, {
    message: 'O horário de término deve ser após o horário de início.',
    path: ['endTime'],
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export default function AdminSchedulePage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const configDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'businessHours') : null), [firestore]);
  const { data: configData, isLoading: isConfigLoading } = useDoc<BusinessHours>(configDocRef);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      startTime: '09:00',
      endTime: '18:00',
      workingDays: [1, 2, 3, 4, 5], // Default to Monday to Friday
    },
  });

  useEffect(() => {
    if (configData) {
      form.reset(configData);
    }
  }, [configData, form]);

  const onSubmit = (values: ScheduleFormValues) => {
    if (!configDocRef) return;

    setDoc(configDocRef, values, { merge: true }).then(() => {
      toast({
        title: 'Horários Atualizados!',
        description: 'Seu novo horário de funcionamento foi salvo.',
      });
    }).catch(error => {
      console.error('Erro ao salvar os horários:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações de horário.',
      });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: configDocRef.path,
        operation: 'update',
        requestResourceData: values,
      }));
    });
  };
  
  if (isConfigLoading) {
      return (
          <Card className="max-w-2xl">
              <CardHeader>
                  <CardTitle>Horário de Funcionamento</CardTitle>
                  <CardDescription>Defina os dias e horários em que os clientes podem agendar serviços.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                  <div className="grid sm:grid-cols-2 gap-4">
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                  </div>
                  <div className="space-y-4">
                      <Skeleton className="h-6 w-1/3" />
                      <div className="space-y-2">
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                      </div>
                  </div>
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
        <CardTitle>Horário de Funcionamento</CardTitle>
        <CardDescription>
          Defina os dias e horários em que os clientes podem agendar serviços.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
             <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Horário de Abertura</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {timeSlots.map(time => (
                            <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Horário de Fechamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {timeSlots.map(time => (
                            <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormField
                control={form.control}
                name="workingDays"
                render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Dias de Funcionamento</FormLabel>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {daysOfWeek.map((day) => (
                            <FormField
                            key={day.id}
                            control={form.control}
                            name="workingDays"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={day.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(day.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...field.value, day.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== day.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {day.label}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Horários
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    