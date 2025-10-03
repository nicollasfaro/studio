'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Promotion } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function PromotionsPage() {
  const firestore = useFirestore();
  const promotionsCollectionRef = useMemoFirebase(() => collection(firestore, 'promotions'), [firestore]);
  const { data: promotions, isLoading } = useCollection<Omit<Promotion, 'id'>>(promotionsCollectionRef);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline tracking-tight">Promoções Especiais</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Aproveite nossas ofertas exclusivas e receba o mimo que você merece por menos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-12">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="w-full overflow-hidden shadow-lg md:flex">
             <div className="md:w-1/3">
                <Skeleton className="w-full h-full aspect-[4/3] md:aspect-auto" />
             </div>
             <div className="md:w-2/3 flex flex-col p-6">
                <Skeleton className="h-6 w-1/4 mb-4" />
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-auto" />
                <Skeleton className="h-12 w-1/3 mt-4" />
             </div>
          </Card>
        ))}
        {promotions && promotions.map((promo) => {
          const promoImage = PlaceHolderImages.find((img) => img.id === promo.imageId);
          return (
            <Card key={promo.id} className="w-full overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 md:flex">
              {promoImage && (
                <div className="md:w-1/3">
                  <Image
                    src={promoImage.imageUrl}
                    alt={promoImage.description}
                    width={600}
                    height={400}
                    className="object-cover h-full w-full"
                    data-ai-hint={promoImage.imageHint}
                  />
                </div>
              )}
              <div className="md:w-2/3 flex flex-col">
                <CardHeader className="p-6">
                  <Badge variant="default" className="w-fit bg-accent text-accent-foreground mb-2">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Oferta por tempo limitado
                  </Badge>
                  <CardTitle className="font-headline text-3xl">{promo.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-grow">
                  <CardDescription className="text-base">{promo.description}</CardDescription>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button asChild size="lg">
                    <Link href="/book">Agendar esta Oferta</Link>
                  </Button>
                </CardFooter>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
