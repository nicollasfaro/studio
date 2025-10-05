
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Service, GalleryImage } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ServicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const servicesCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'services') : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Omit<Service, 'id'>>(servicesCollectionRef);
  
  const galleryImagesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'galleryImages') : null), [firestore]);
  const { data: galleryImages, isLoading: isLoadingGallery } = useCollection<GalleryImage>(galleryImagesRef);

  const isLoading = isLoadingServices || isLoadingGallery;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline tracking-tight">Nossos Serviços</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Oferecemos uma ampla gama de tratamentos de beleza e bem-estar para ajudar você a se sentir e parecer o seu melhor.
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
        {services && galleryImages && services.map((service) => {
          const serviceImage = galleryImages.find((img) => img.id === service.imageId);
          const bookHref = user ? `/book?service=${service.id}` : '/login';
          return (
            <Card key={service.id} id={service.id} className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="p-0">
                  <div className="aspect-w-16 aspect-h-9">
                    {serviceImage && (
                      <Image
                        src={serviceImage.imageUrl}
                        alt={service.name}
                        width={600}
                        height={400}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
              </CardHeader>
              <CardContent className="p-6 flex-grow">
                <CardTitle className="font-headline text-2xl mb-2">{service.name}</CardTitle>
                <CardDescription className="text-base">{service.description}</CardDescription>
                {service.isPriceFrom && (
                    <div className="mt-4 p-3 bg-secondary/50 rounded-md text-sm">
                        <p className="font-bold text-secondary-foreground">Preços por Comprimento:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                            <li>Curto: R${service.priceShortHair?.toFixed(2)}</li>
                            <li>Médio: R${service.priceMediumHair?.toFixed(2)}</li>
                            <li>Longo: R${service.priceLongHair?.toFixed(2)}</li>
                        </ul>
                    </div>
                )}
              </CardContent>
              <CardFooter className="p-6 pt-0 flex justify-between items-center">
                <div>
                  <p className="text-xl font-bold text-primary">{service.isPriceFrom ? 'A partir de' : ''} R${service.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{service.durationMinutes} minutos</p>
                </div>
                <Button asChild>
                  <Link href={bookHref}>Agendar Agora</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

    