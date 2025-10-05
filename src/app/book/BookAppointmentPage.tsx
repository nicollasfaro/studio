'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, ArrowRight, PartyPopper, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, addMinutes, parse } from 'date-fns';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Service, Appointment, Promotion } from '@/lib/types';
import { timeSlots as allTimeSlots } from '@/lib/data';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function BookAppointmentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const serviceQueryParam = searchParams.get('service');
  const promoQueryParam = searchParams.get('promo');

  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(serviceQueryParam || undefined);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  const [servicesToDisplay, setServicesToDisplay] = useState<Service[]>([]);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const servicesCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: allServices, isLoading: isLoadingServices } = useCollection<Service>(servicesCollectionRef);

  const promotionRef = useMemoFirebase(() => (firestore && promoQueryParam ? doc(firestore, 'promotions', promoQueryParam) : null), [firestore, promoQueryParam]);
  const { data: promotion, isLoading: isLoadingPromotion } = useDoc<Promotion>(promotionRef);

  // Filter services based on promotion
  useEffect(() => {
    if (isLoadingServices || isLoadingPromotion) return;

    if (promoQueryParam && promotion && allServices) {
        const promoServices = allServices
            .filter(service => promotion.serviceIds.includes(service.id))
            .map(service => {
                const discountedPrice = service.price * (1 - promotion.discountPercentage / 100);
                return { 
                    ...service, 
                    originalPrice: service.price,
                    price: discountedPrice 
                };
            });
        setServicesToDisplay(promoServices);
        // If a service was pre-selected but is not in the promo, deselect it
        if(selectedServiceId && !promoServices.some(s => s.id === selectedServiceId)) {
          setSelectedServiceId(undefined);
        }
    } else if (allServices) {
        setServicesToDisplay(allServices);
    }
  }, [allServices, promotion, promoQueryParam, isLoadingServices, isLoadingPromotion, selectedServiceId]);

  // Fetch appointments for the selected day to check for conflicts
  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !date) return null;
    const start = startOfDay(date);
    const end = endOfDay(date);
    return query(
      collection(firestore, 'appointments'),
      where('startTime', '>=', start.toISOString()),
      where('startTime', '<=', end.toISOString())
    );
  }, [firestore, date]);
  
  const { data: todaysAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  // Memoize available time slots calculation
  const availableTimeSlots = useMemo(() => {
    if (isLoadingAppointments || !todaysAppointments || !allServices) {
      return allTimeSlots.map(slot => ({ ...slot, available: false }));
    }
    
    const bookedSlots = new Set<string>();

    todaysAppointments.forEach(apt => {
        if (apt.status === 'cancelado') return; // Ignore canceled appointments

        const service = allServices.find(s => s.id === apt.serviceId);
        if (!service) return; // Ignore if service details are not found

        const startTime = parse(format(new Date(apt.startTime), 'HH:mm'), 'HH:mm', new Date());
        const endTime = addMinutes(startTime, service.durationMinutes);
        
        allTimeSlots.forEach(slot => {
            const slotTime = parse(slot.time, 'HH:mm', new Date());
            if (slotTime >= startTime && slotTime < endTime) {
                bookedSlots.add(slot.time);
            }
        });
    });
    
    return allTimeSlots.map(slot => ({
      ...slot,
      available: !bookedSlots.has(slot.time)
    }));

  }, [todaysAppointments, allServices, isLoadingAppointments]);


  const handleNextStep = () => {
    if (step === 1 && !selectedServiceId) {
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
    setIsBooking(true);
    if (!selectedServiceId || !date || !selectedTime || !name || !email) {
      toast({ title: 'Por favor, preencha todos os campos.', variant: 'destructive' });
      setIsBooking(false);
      return;
    }

    if (isUserLoading) {
      toast({ title: 'Aguarde um momento...', description: 'Verificando sua autenticação.' });
      setIsBooking(false);
      return;
    }

    if (!user) {
      setShowAuthAlert(true);
      setIsBooking(false);
      return;
    }

    const serviceDetails = allServices?.find(s => s.id === selectedServiceId);
    if (!serviceDetails) {
        toast({ title: 'Serviço selecionado não encontrado.', variant: 'destructive' });
        setIsBooking(false);
        return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + serviceDetails.durationMinutes * 60000);

    const appointmentsRef = collection(firestore, 'appointments');
    
    addDocumentNonBlocking(appointmentsRef, {
        clientId: user.uid,
        serviceId: selectedServiceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'Marcado',
        clientName: name,
        clientEmail: email
    });

    toast({
      title: 'Agendamento Solicitado!',
      description: `Estamos ansiosos para vê-lo em ${format(date, 'PPP', { locale: ptBR })} às ${selectedTime}. Aguarde a confirmação do Salão!`,
    });
    setStep(4);
    setIsBooking(false);
  };

  const currentService = servicesToDisplay?.find(s => s.id === selectedServiceId);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center">
            {step === 4 ? 'Solicitação Recebida!' : 'Faça seu Agendamento'}
          </CardTitle>
          <CardDescription className="text-center">
            {step < 4 && `Passo ${step} de 3 - ${step === 1 ? 'Escolha o Serviço' : step === 2 ? 'Selecione a Data e Hora' : 'Confirme os Detalhes'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {promoQueryParam && promotion && (
            <Alert className="mb-6 bg-accent/10 border-accent/50 text-accent-foreground">
              <Info className="h-4 w-4 !text-accent" />
              <AlertTitle className="font-bold text-accent">Você está agendando com uma promoção!</AlertTitle>
              <AlertDescription>
                Os preços e serviços abaixo são exclusivos da promoção "{promotion.name}".
              </AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Selecione um Serviço</h3>
              <RadioGroup value={selectedServiceId} onValueChange={setSelectedServiceId}>
                {(isLoadingServices || (promoQueryParam && isLoadingPromotion)) && <p>Carregando serviços...</p>}
                {servicesToDisplay?.map((service) => (
                  <Label
                    key={service.id}
                    htmlFor={service.id}
                    className={cn(
                        "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all hover:bg-secondary/50",
                        selectedServiceId === service.id && "bg-secondary border-primary ring-2 ring-primary"
                    )}
                  >
                    <div>
                      <p className="font-semibold">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-primary">R${service.price.toFixed(2)}</p>
                      {service.originalPrice && (
                        <p className="text-sm text-muted-foreground line-through">
                          R${service.originalPrice.toFixed(2)}
                        </p>
                      )}
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
                {isLoadingAppointments || isLoadingServices ? <p>Verificando horários disponíveis...</p> : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimeSlots.map((slot) => (
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
                )}
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
                            <span className="font-semibold">{currentService?.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Data:</span>
                            <span className="font-semibold">{date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Hora:</span>
                            <span className="font-semibold">{selectedTime}</span>
                        </div>
                         <div className="flex justify-between border-t pt-4 mt-4">
                            <span className="text-muted-foreground">Valor:</span>
                            <span className="font-semibold text-primary">R${currentService?.price.toFixed(2)}</span>
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
              <p className="max-w-md text-muted-foreground">Sua solicitação de agendamento foi recebida. Enviamos os detalhes para o seu e-mail e você será notificado assim que o salão confirmar. Mal podemos esperar para mimar você!</p>
              <Button asChild>
                <Link href="/">Voltar para o Início</Link>
              </Button>
            </div>
          )}
        </CardContent>
        {step < 4 && (
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
              <ArrowLeft /> Voltar
            </Button>
            {step < 3 ? (
              <Button onClick={handleNextStep}>
                Próximo <ArrowRight />
              </Button>
            ) : (
              <Button onClick={handleBooking} disabled={isBooking || isUserLoading || isLoadingAppointments}>
                {isBooking ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
      <AlertDialog open={showAuthAlert} onOpenChange={setShowAuthAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ação Necessária</AlertDialogTitle>
            <AlertDialogDescription>
              Para fazer um agendamento, você precisa estar logado. Por favor, faça login ou registre-se para continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
                <Link href="/register">Registrar</Link>
            </AlertDialogAction>
            <AlertDialogAction asChild>
                <Link href="/login">Login</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
