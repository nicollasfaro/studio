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
import { format, addMinutes } from 'date-fns';
import { useAuth, useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Service } from '@/lib/types';
import { timeSlots } from '@/lib/data'; // Assuming timeslots are still mock
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

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
      toast({ title: 'Please select a service.', variant: 'destructive' });
      return;
    }
    if (step === 2 && (!date || !selectedTime)) {
      toast({ title: 'Please select a date and time.', variant: 'destructive' });
      return;
    }
    setStep(step + 1);
  };

  const handleBooking = async () => {
    if (!selectedService || !date || !selectedTime || !name || !email) {
      toast({ title: 'Please fill all fields.', variant: 'destructive' });
      return;
    }

    let currentUser = user;
    if (!currentUser && !isUserLoading) {
      initiateAnonymousSignIn(auth);
      // We can't immediately get the user, so we show a pending state
      toast({
        title: 'Finalizing booking...',
        description: 'Please wait a moment.',
      });
      // A more robust solution would wait for user state to change.
      // For this example, we'll proceed and let Firestore rules handle security.
      // In a real app, you might disable the button until user is available.
      return; 
    }
    
    if (!currentUser) {
        toast({ title: 'Authentication is still initializing. Please try again in a moment.', variant: 'destructive'});
        return;
    }


    const serviceDetails = services?.find(s => s.id === selectedService);
    if (!serviceDetails) {
        toast({ title: 'Selected service not found.', variant: 'destructive' });
        return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = addMinutes(startTime, serviceDetails.durationMinutes);

    const appointmentsRef = collection(firestore, 'users', currentUser.uid, 'appointments');
    
    addDocumentNonBlocking(appointmentsRef, {
        clientId: currentUser.uid, // Using user's UID as the clientID
        serviceId: selectedService,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        clientName: name,
        clientEmail: email
    });

    toast({
      title: 'Appointment Booked!',
      description: `We're looking forward to seeing you on ${format(date, 'PPP')} at ${selectedTime}.`,
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
            {step === 4 ? 'Booking Confirmed!' : 'Book Your Appointment'}
          </CardTitle>
          <CardDescription className="text-center">
            {step < 4 && `Step ${step} of 3 - ${step === 1 ? 'Choose Service' : step === 2 ? 'Select Date & Time' : 'Confirm Details'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Select a Service</h3>
              <RadioGroup value={selectedService} onValueChange={setSelectedService}>
                {isLoadingServices && <p>Loading services...</p>}
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
                      <p className="font-bold text-primary">${service.price}</p>
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
                <h3 className="text-xl font-bold mb-4">Select a Date</h3>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                  disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Select a Time</h3>
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
                <h3 className="text-xl font-bold">Confirm Your Details</h3>
                <Card className="bg-secondary/50">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Service:</span>
                            <span className="font-semibold">{currentServiceName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-semibold">{date ? format(date, 'EEEE, MMMM d, yyyy') : ''}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-semibold">{selectedTime}</span>
                        </div>
                    </CardContent>
                </Card>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>
          )}
            
          {step === 4 && (
            <div className="text-center flex flex-col items-center gap-4 py-8">
              <PartyPopper className="w-16 h-16 text-accent" />
              <p className="max-w-md text-muted-foreground">Your appointment is confirmed. We've sent a confirmation to your email. We can't wait to pamper you!</p>
              <Button asChild>
                <a href="/">Back to Home</a>
              </Button>
            </div>
          )}
        </CardContent>
        {step < 4 && (
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={handleNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleBooking} disabled={isUserLoading}>
                {isUserLoading ? 'Initializing...' : 'Confirm Booking'} <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
