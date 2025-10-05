
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Service, Promotion, GalleryImage } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user } = useUser();
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  const firestore = useFirestore();
  
  const servicesCollectionRef = useMemoFirebase(() => (firestore ? query(collection(firestore, 'services'), limit(3)) : null), [firestore]);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesCollectionRef);

  const promotionsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'promotions'), orderBy('startDate', 'desc'), limit(1)) : null), [firestore]);
  const { data: promotions, isLoading: isLoadingPromotions } = useCollection<Promotion>(promotionsQuery);
  
  const galleryImagesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'galleryImages') : null), [firestore]);
  const { data: galleryImages, isLoading: isLoadingGallery } = useCollection<GalleryImage>(galleryImagesRef);


  const featuredServices = services || [];
  const latestPromotion = promotions?.[0];
  const promotionImage = galleryImages?.find((img) => img.id === latestPromotion?.imageId);
  
  const bookHref = user ? '/book' : '/login';
  const promoBookHref = latestPromotion ? (user ? `/book?promo=${latestPromotion.id}` : '/login') : '/promotions';

  const isLoading = isLoadingServices || isLoadingPromotions || isLoadingGallery;
  
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <section className="relative w-full h-[60vh] md:h-[80vh]">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative h-full flex flex-col items-center justify-center text-center text-white p-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline tracking-tighter mb-4 drop-shadow-lg">
            Experimente o Verdadeiro Glamour
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-primary-foreground/90 mb-8 drop-shadow-md">
            Mime-se com nossos tratamentos de beleza de classe mundial e deixe seu brilho interior resplandecer.
          </p>
          <Button asChild size="lg" className="font-bold">
            <Link href={bookHref}>
              Agende um Horário <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <section id="services" className="w-full py-12 md:py-20 lg:py-24">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline tracking-tight">Nossos Serviços Exclusivos</h2>
            <p className="max-w-2xl text-muted-foreground md:text-xl">
              Descubra nossa gama de serviços projetados para mimar e rejuvenescer você da cabeça aos pés.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex flex-col overflow-hidden">
                    <CardHeader className="p-0">
                        <Skeleton className="w-full h-48" />
                    </CardHeader>
                    <CardContent className="p-6 flex-grow">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardContent>
                    <CardFooter className="p-6 pt-0 flex justify-between items-center">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-10 w-1/3" />
                    </CardFooter>
                </Card>
            ))}
            {featuredServices.map((service) => {
              const serviceImage = galleryImages?.find(p => p.id === service.imageId)
              return (
                <Card key={service.id} className="flex flex-col overflow-hidden transform hover:scale-105 transition-transform duration-300 ease-in-out shadow-lg hover:shadow-2xl">
                  <CardHeader className="p-0">
                    {serviceImage && <Image
                      src={serviceImage.imageUrl}
                      alt={service.name}
                      width={600}
                      height={400}
                      className="object-cover w-full h-48"
                    />}
                  </CardHeader>
                  <CardContent className="p-6 flex-grow">
                    <CardTitle className="font-headline text-2xl mb-2">{service.name}</CardTitle>
                    <CardDescription>{service.description?.substring(0, 100)}...</CardDescription>
                  </CardContent>
                  <CardFooter className="p-6 pt-0 flex justify-between items-center">
                    <p className="text-lg font-bold text-primary">{service.isPriceFrom ? 'A partir de ' : ''}R${service.price.toFixed(2)}</p>
                    <Button asChild variant="outline">
                      <Link href={`/services#${service.id}`}>Saiba Mais</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <Button asChild variant="link" className="text-lg">
              <Link href="/services">
                Ver Todos os Serviços <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="promotions" className="w-full py-12 md:py-20 lg:py-24 bg-secondary/50">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4">
              <Badge variant="default" className="w-fit bg-accent text-accent-foreground">
                <Sparkles className="mr-2 h-4 w-4" />
                Oferta Especial
              </Badge>
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-3/4" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                   <div className="flex flex-col sm:flex-row gap-4 mt-4">
                      <Skeleton className="h-12 w-36" />
                      <Skeleton className="h-12 w-48" />
                   </div>
                </>
              ) : latestPromotion ? (
                <>
                  <h2 className="text-3xl md:text-4xl font-headline tracking-tight">{latestPromotion.name}</h2>
                  <p className="max-w-xl text-muted-foreground md:text-xl">
                    {latestPromotion.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button asChild size="lg" className="font-bold">
                      <Link href={promoBookHref}>Aproveitar Oferta</Link>
                    </Button>
                     <Button asChild size="lg" variant="outline">
                      <Link href="/promotions">Ver Todas as Promoções</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                    <h2 className="text-3xl md:text-4xl font-headline tracking-tight">Nenhuma promoção no momento</h2>
                    <p className="max-w-xl text-muted-foreground md:text-xl">
                       Fique de olho para futuras ofertas especiais e descontos exclusivos!
                    </p>
                </>
              )}
            </div>
             {isLoading ? <Skeleton className="w-full h-[400px] rounded-xl"/> : promotionImage && (
              <Image
                src={promotionImage.imageUrl}
                alt={promotionImage.description}
                width={600}
                height={600}
                className="mx-auto aspect-square overflow-hidden rounded-xl object-cover"
                data-ai-hint={promotionImage.description}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

    