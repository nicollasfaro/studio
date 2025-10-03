'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Service } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ServicesPage() {
  const firestore = useFirestore();
  const servicesCollectionRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const { data: services, isLoading } = useCollection<Omit<Service, 'id'>>(servicesCollectionRef);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline tracking-tight">Our Services</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          We offer a wide range of beauty and wellness treatments to help you look and feel your best.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
              <Skeleton className="w-full h-48" />
            </CardHeader>
            <CardContent className="p-6 flex-grow">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardContent>
            <CardFooter className="p-6 pt-0 flex justify-between items-center">
              <div className="w-1/3">
                <Skeleton className="h-6 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-10 w-1/3" />
            </CardFooter>
          </Card>
        ))}
        {services && services.map((service) => {
          const serviceImage = PlaceHolderImages.find((img) => img.id === service.imageId);
          return (
            <Card key={service.id} className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="p-0">
                {serviceImage && (
                  <div className="aspect-w-16 aspect-h-9">
                    <Image
                      src={serviceImage.imageUrl}
                      alt={serviceImage.description}
                      width={600}
                      height={400}
                      className="object-cover w-full h-full"
                      data-ai-hint={serviceImage.imageHint}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6 flex-grow">
                <CardTitle className="font-headline text-2xl mb-2">{service.name}</CardTitle>
                <CardDescription className="text-base">{service.description}</CardDescription>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex justify-between items-center">
                <div>
                  <p className="text-xl font-bold text-primary">${service.price}</p>
                  <p className="text-sm text-muted-foreground">{service.durationMinutes} minutes</p>
                </div>
                <Button asChild>
                  <Link href={`/book?service=${service.id}`}>Book Now</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
