'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Check, ArrowLeft, ArrowRight, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth, useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Service } from '@/lib/types';
import { timeSlots } from '@/lib/data';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { ptBR } from 'date-fns/locale';

export default function BookAppointmentPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | undefined>(searchParams.get('service') || undefined);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const servicesCollectionRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service, 'id'>>(servicesCollectionRef);

  const handleNextStep = () => {
    if (step === 1 && !selectedService) {
      toast({ title: 'Por favor, selecione um serviço.', variant: 'destructive' });
      return;
    }
    if (step === 2 && (!date || !selectedTime)) {
      toast({ title: 'Por favor, selecione uma data e hora.', variant: 'destructive' });
      return;
    }
    setStep(step + 1);
  };

  const handleBooking = async () => {
    if (!selectedService || !date || !selectedTime || !name || !email) {
      toast({ title: 'Por favor, preencha todos os campos.', variant: 'destructive' });
      return;
    }

    let currentUser = user;
    if (!currentUser && !isUserLoading) {
      initiateAnonymousSignIn(auth);
      toast({
        title: 'Finalizando agendamento...',
        description: 'Por favor, aguarde um momento.',
      });
      return; 
    }
    
    if (!currentUser) {
        toast({ title: 'A autenticação ainda está inicializando. Por favor, tente novamente em um momento.', variant: 'destructive'});
        return;
    }


    const serviceDetails = services?.find(s => s.id === selectedService);
    if (!serviceDetails) {
        toast({ title: 'Serviço selecionado não encontrado.', variant: 'destructive' });
        return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + serviceDetails.durationMinutes * 60000);

    const appointmentsRef = collection(firestore, 'users', currentUser.uid, 'appointments');
    
    addDocumentNonBlocking(appointmentsRef, {
        clientId: currentUser.uid,
        serviceId: selectedService,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        clientName: name,
        clientEmail: email
    });

    toast({
      title: 'Agendamento Confirmado!',
      description: `Estamos ansiosos para vê-lo em ${format(date, 'PPP', { locale: ptBR })} às ${selectedTime}.`,
    });
    setStep(4);
  };

  const currentService = services?.find(s => s.id === selectedService);
  const currentServiceName = currentService?.name;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center">
            {step === 4 ? 'Agendamento Confirmado!' : 'Faça seu Agendamento'}
          </CardTitle>
          <CardDescription className="text-center">
            {step < 4 && `Passo ${step} de 3 - ${step === 1 ? 'Escolha o Serviço' : step === 2 ? 'Selecione a Data e Hora' : 'Confirme os Detalhes'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Selecione um Serviço</h3>
              <RadioGroup value={selectedService} onValueChange={setSelectedService}>
                {isLoadingServices && <p>Carregando serviços...</p>}
                {services?.map((service) => (
                  <Label
                    key={service.id}
                    htmlFor={service.id}
                    className={cn(
                        "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all hover:bg-secondary/50",
                        selectedService === service.id && "bg-secondary border-primary ring-2 ring-primary"
                    )}
                  >
                    <div>
                      <p className="font-semibold">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R${service.price.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{service.durationMinutes} min</p>
                    </div>
                    <RadioGroupItem value={service.id} id={service.id} className="sr-only" />
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Selecione uma Data</h3>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                  disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                  locale={ptBR}
                />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Selecione uma Hora</h3>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? 'default' : 'outline'}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
                <h3 className="text-xl font-bold">Confirme Seus Dados</h3>
                <Card className="bg-secondary/50">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Serviço:</span>
                            <span className="font-semibold">{currentServiceName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Data:</span>
                            <span className="font-semibold">{date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Hora:</span>
                            <span className="font-semibold">{selectedTime}</span>
                        </div>
                    </CardContent>
                </Card>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Endereço de Email</Label>
                  <Input id="email" type="email" placeholder="jane@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>
          )}
            
          {step === 4 && (
            <div className="text-center flex flex-col items-center gap-4 py-8">
              <PartyPopper className="w-16 h-16 text-accent" />
              <p className="max-w-md text-muted-foreground">Seu agendamento está confirmado. Enviamos uma confirmação para o seu e-mail. Mal podemos esperar para mimar você!</p>
              <Button asChild>
                <a href="/">Voltar para o Início</a>
              </Button>
            </div>
          )}
        </CardContent>
        {step < 4 && (
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            {step < 3 ? (
              <Button onClick={handleNextStep}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleBooking} disabled={isUserLoading}>
                {isUserLoading ? 'Inicializando...' : 'Confirmar Agendamento'} <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
