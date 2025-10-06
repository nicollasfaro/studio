'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { ArrowLeft, ArrowRight, PartyPopper, Loader2, Info, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, addMinutes, parse, getDay } from 'date-fns';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { collection, query, where, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Service, Appointment, Promotion, BusinessHours } from '@/lib/types';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function BookAppointmentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const serviceQueryParam = searchParams.get('service');
  const promoQueryParam = searchParams.get('promo');
  const rescheduleId = searchParams.get('remarcarId');

  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(serviceQueryParam || undefined);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  const [servicesToDisplay, setServicesToDisplay] = useState<Service[]>([]);
  
  const [hairLength, setHairLength] = useState<'curto' | 'medio' | 'longo'>();
  const [hairPhotoDataUrl, setHairPhotoDataUrl] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | undefined>();

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const servicesCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: allServices, isLoading: isLoadingServices } = useCollection<Service>(servicesCollectionRef);

  const promotionRef = useMemoFirebase(() => (firestore && promoQueryParam ? doc(firestore, 'promotions', promoQueryParam) : null), [firestore, promoQueryParam]);
  const { data: promotion, isLoading: isLoadingPromotion } = useDoc<Promotion>(promotionRef);

  const appointmentToRescheduleRef = useMemoFirebase(() => (firestore && rescheduleId ? doc(firestore, 'appointments', rescheduleId) : null), [firestore, rescheduleId]);
  const { data: appointmentToReschedule, isLoading: isLoadingReschedule } = useDoc<Appointment>(appointmentToRescheduleRef);

  const businessHoursRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'businessHours') : null), [firestore]);
  const { data: businessHours, isLoading: isLoadingBusinessHours } = useDoc<BusinessHours>(businessHoursRef);

  // Auto-fill user data if logged in
  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Set service ID if rescheduling
  useEffect(() => {
    if (rescheduleId && appointmentToReschedule && !selectedServiceId) {
      setSelectedServiceId(appointmentToReschedule.serviceId);
      // Data is already filled by the user effect or from the appointment itself if user is not logged in
      setName(appointmentToReschedule.clientName);
      setEmail(appointmentToReschedule.clientEmail);
    }
  }, [appointmentToReschedule, rescheduleId, selectedServiceId]);

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
  
  const currentService = servicesToDisplay?.find(s => s.id === selectedServiceId);

  // Update final price based on service and hair length
  useEffect(() => {
    if (currentService) {
        if (currentService.isPriceFrom && hairLength) {
            const prices = {
                curto: currentService.priceShortHair,
                medio: currentService.priceMediumHair,
                longo: currentService.priceLongHair
            }
            setFinalPrice(prices[hairLength]);
        } else {
            setFinalPrice(currentService.price);
        }
    }
  }, [currentService, hairLength]);

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

  const isDayDisabled = (day: Date) => {
    const today = startOfDay(new Date());
    if (day < today) return true;
    if (businessHours && businessHours.workingDays) {
        const dayOfWeek = getDay(day);
        return !businessHours.workingDays.includes(dayOfWeek);
    }
    return true; // Disable all days if business hours are not loaded
  }

  // Set initial date only if today is a valid working day
  useEffect(() => {
      if (!date && businessHours) {
        let checkDate = new Date();
        let attempts = 0;
        while(isDayDisabled(checkDate) && attempts < 7) {
            checkDate.setDate(checkDate.getDate() + 1);
            attempts++;
        }
        if (!isDayDisabled(checkDate)) {
           setDate(checkDate);
        }
      }
  }, [businessHours, date]);

  // Generate time slots based on business hours
  const timeSlots = useMemo(() => {
    if (!businessHours) return [];
    
    const slots = [];
    const { startTime, endTime } = businessHours;
    let current = parse(startTime, 'HH:mm', new Date());
    const end = parse(endTime, 'HH:mm', new Date());

    while (current < end) {
        slots.push({ time: format(current, 'HH:mm'), available: true });
        current = addMinutes(current, 30); // Assuming 30 minute intervals, can be configured
    }
    return slots;
  }, [businessHours]);


  // Memoize available time slots calculation
  const availableTimeSlots = useMemo(() => {
    if (isLoadingAppointments || !todaysAppointments || !allServices || !timeSlots.length || !businessHours || !currentService) {
      return timeSlots.map(slot => ({ ...slot, available: false }));
    }
    
    const bookedSlots = new Set<string>();
    const closingTime = parse(businessHours.endTime, 'HH:mm', new Date());

    todaysAppointments.forEach(apt => {
        // When rescheduling, ignore the appointment being rescheduled from conflict checking
        if (rescheduleId && apt.id === rescheduleId) return;

        if (apt.status === 'cancelado') return; // Ignore canceled appointments

        const service = allServices.find(s => s.id === apt.serviceId);
        if (!service) return; // Ignore if service details are not found

        const startTime = parse(format(new Date(apt.startTime), 'HH:mm'), 'HH:mm', new Date());
        const endTime = addMinutes(startTime, service.durationMinutes);
        
        timeSlots.forEach(slot => {
            const slotTime = parse(slot.time, 'HH:mm', new Date());
            if (slotTime >= startTime && slotTime < endTime) {
                bookedSlots.add(slot.time);
            }
        });
    });
    
    return timeSlots.map(slot => {
      const slotTime = parse(slot.time, 'HH:mm', new Date());
      const slotEndTime = addMinutes(slotTime, currentService.durationMinutes);
      // A slot is available if it's not in the booked set AND if the service fits before closing time.
      const isAvailable = !bookedSlots.has(slot.time) && slotEndTime <= closingTime;

      return {
        ...slot,
        available: isAvailable
      }
    });

  }, [todaysAppointments, allServices, isLoadingAppointments, rescheduleId, timeSlots, businessHours, currentService]);


  const handleNextStep = () => {
    if (step === 1 && !selectedServiceId) {
      toast({ title: 'Por favor, selecione um serviço.', variant: 'destructive' });
      return;
    }
    if (currentService?.isPriceFrom && step === 2) {
        if (!hairLength) {
            toast({ title: 'Por favor, selecione o comprimento do cabelo.', variant: 'destructive' });
            return;
        }
        if (!hairPhotoDataUrl) {
            toast({ title: 'Por favor, anexe uma foto do seu cabelo.', variant: 'destructive' });
            return;
        }
    }
    const dateStep = currentService?.isPriceFrom ? 3 : 2;
    if (step === dateStep && (!date || !selectedTime)) {
      toast({ title: 'Por favor, selecione uma data e hora.', variant: 'destructive' });
      return;
    }
    setStep(step + 1);
  };
  
  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
            variant: 'destructive',
            title: 'Arquivo muito grande',
            description: 'A imagem deve ter no máximo 5MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setHairPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleBooking = async () => {
    setIsBooking(true);

    if (!selectedServiceId || !name || !email || !date || !selectedTime) {
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
        toast({ title: 'Detalhes do serviço não encontrados.', variant: 'destructive' });
        setIsBooking(false);
        return;
    }

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, serviceDetails.durationMinutes);
      
      const appointmentData: Omit<Appointment, 'id'> = {
          clientId: user.uid,
          serviceId: selectedServiceId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: 'Marcado',
          clientName: name,
          clientEmail: email,
          finalPrice: finalPrice,
          viewedByAdmin: false,
          hairLength: hairLength,
          hairPhotoUrl: hairPhotoDataUrl,
      };

      if (rescheduleId && appointmentToRescheduleRef) {
          await updateDoc(appointmentToRescheduleRef, appointmentData)
          toast({
            title: 'Agendamento Remarcado!',
            description: `Seu agendamento foi atualizado para ${format(date, 'PPP', { locale: ptBR })} às ${selectedTime}.`,
          });
          router.push('/profile');

      } else {
          const appointmentsRef = collection(firestore, 'appointments');
          await addDoc(appointmentsRef, appointmentData)
          toast({
            title: 'Agendamento Solicitado!',
            description: `Estamos ansiosos para vê-lo em ${format(date, 'PPP', { locale: ptBR })} às ${selectedTime}. Aguarde a confirmação do Salão!`,
          });
          setStep(totalSteps + 1);
      }

    } catch (error: any) {
        console.error("Booking Error:", error);
        toast({ title: 'Erro ao agendar', description: error.message || 'Não foi possível salvar o agendamento.', variant: 'destructive' });
        
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `appointments`,
          operation: 'create',
          requestResourceData: { serviceId: selectedServiceId, clientId: user.uid },
        }));
    } finally {
        setIsBooking(false);
    }
  };
  
  const pageTitle = rescheduleId ? 'Remarcar Agendamento' : 'Faça seu Agendamento';
  const totalSteps = currentService?.isPriceFrom ? 4 : 3;
  const hairLengthStep = 2;
  const dateTimeStep = currentService?.isPriceFrom ? 3 : 2;
  const confirmationStep = currentService?.isPriceFrom ? 4 : 3;
  const successStep = totalSteps + 1;


  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center">
            {step === successStep ? 'Solicitação Recebida!' : pageTitle}
          </CardTitle>
          <CardDescription className="text-center">
            {step < successStep && `Passo ${step} de ${totalSteps}`}
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
               {rescheduleId && (
                  <Alert variant="default" className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-semibold">Remarcando</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Você está remarcando o serviço: <span className="font-semibold">{currentService?.name}</span>. Para trocar o serviço, cancele e faça um novo agendamento.
                    </AlertDescription>
                  </Alert>
                )}
              <RadioGroup value={selectedServiceId} onValueChange={setSelectedServiceId} disabled={!!rescheduleId}>
                {(isLoadingServices || (promoQueryParam && isLoadingPromotion) || isLoadingReschedule) && <p>Carregando serviços...</p>}
                {servicesToDisplay?.map((service) => (
                  <Label
                    key={service.id}
                    htmlFor={service.id}
                    className={cn(
                        "flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-secondary/50",
                        selectedServiceId === service.id && "bg-secondary border-primary ring-2 ring-primary",
                        !!rescheduleId ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                    )}
                  >
                    <div>
                      <p className="font-semibold">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-primary">{service.isPriceFrom ? 'A partir de ' : ''}R${service.price.toFixed(2)}</p>
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
          
          {step === hairLengthStep && currentService?.isPriceFrom && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Selecione o Comprimento do Cabelo</h3>
                <RadioGroup value={hairLength} onValueChange={(v) => setHairLength(v as any)}>
                    {([
                        {id: 'curto', label: 'Curto', price: currentService.priceShortHair},
                        {id: 'medio', label: 'Médio', price: currentService.priceMediumHair},
                        {id: 'longo', label: 'Longo', price: currentService.priceLongHair},
                    ]).map((item) => (
                        <Label key={item.id} htmlFor={`hair-${item.id}`} className={cn("flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-secondary/50 cursor-pointer", hairLength === item.id && "bg-secondary border-primary ring-2 ring-primary")}>
                            <div><p className="font-semibold">{item.label}</p></div>
                             <div className="text-right"><p className="font-bold text-primary">R${item.price?.toFixed(2)}</p></div>
                            <RadioGroupItem value={item.id} id={`hair-${item.id}`} className="sr-only" />
                        </Label>
                    ))}
                </RadioGroup>
              </div>
               <div>
                  <h3 className="text-xl font-bold mb-4">Anexe uma foto de referência</h3>
                   <Label htmlFor="hair-photo-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50">
                        {hairPhotoDataUrl ? (
                            <Image src={hairPhotoDataUrl} alt="Pré-visualização do cabelo" width={192} height={192} className="h-full w-auto object-contain rounded-lg p-2" />
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">Clique para fazer upload</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG (MAX. 5MB)</p>
                            </div>
                        )}
                        <Input id="hair-photo-upload" type="file" className="hidden" onChange={handlePhotoUpload} accept="image/png, image/jpeg" />
                   </Label>
              </div>
            </div>
          )}

          {step === dateTimeStep && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Selecione uma Data</h3>
                {isLoadingBusinessHours ? <p>Carregando calendário...</p> : (
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                    disabled={isDayDisabled}
                    locale={ptBR}
                  />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Selecione uma Hora</h3>
                {(isLoadingAppointments || isLoadingServices || isLoadingBusinessHours || !currentService) ? <p>Verificando horários disponíveis...</p> : (
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

          {step === confirmationStep && (
            <div className="space-y-6">
                <h3 className="text-xl font-bold">Confirme Seus Dados</h3>
                <Card className="bg-secondary/50">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Serviço:</span>
                            <span className="font-semibold">{currentService?.name}</span>
                        </div>
                        {currentService?.isPriceFrom && hairLength && (
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">Comprimento:</span>
                                <span className="font-semibold capitalize">{hairLength}</span>
                           </div>
                        )}
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
                            <span className="font-semibold text-primary">R${finalPrice?.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} disabled={!!user || !!rescheduleId} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Endereço de Email</Label>
                  <Input id="email" type="email" placeholder="jane@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!user || !!rescheduleId}/>
                </div>
              </div>
            </div>
          )}
            
          {step === successStep && (
            <div className="text-center flex flex-col items-center gap-4 py-8">
              <PartyPopper className="w-16 h-16 text-accent" />
              <p className="max-w-md text-muted-foreground">Sua solicitação de agendamento foi recebida. Enviamos os detalhes para o seu e-mail e você será notificado assim que o salão confirmar. Mal podemos esperar para mimar você!</p>
              <Button asChild>
                <Link href="/">Voltar para o Início</Link>
              </Button>
            </div>
          )}
        </CardContent>
        {step < successStep && (
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
              <ArrowLeft /> Voltar
            </Button>
            {step < confirmationStep ? (
              <Button onClick={handleNextStep}>
                Próximo <ArrowRight />
              </Button>
            ) : (
              <Button onClick={handleBooking} disabled={isBooking || isUserLoading || isLoadingAppointments}>
                {isBooking ? <Loader2 className="animate-spin" /> : rescheduleId ? 'Confirmar Remarcação' : 'Confirmar Agendamento'}
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
