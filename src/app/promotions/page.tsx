import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { promotions } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PromotionsPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline tracking-tight">Special Promotions</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Enjoy our exclusive offers and get the pampering you deserve for less.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-12">
        {promotions.map((promo) => {
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
                    Limited Time Offer
                  </Badge>
                  <CardTitle className="font-headline text-3xl">{promo.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-grow">
                  <CardDescription className="text-base">{promo.description}</CardDescription>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button asChild size="lg">
                    <Link href="/book">Book This Offer</Link>
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
