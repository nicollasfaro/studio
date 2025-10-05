
'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Image as ImageIcon, Upload, Construction } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

export default function AdminGalleryPage() {

  // As a placeholder, we show the static images.
  // This would be replaced with images from Firebase Storage.
  const images = PlaceHolderImages.filter(img => 
    img.id !== 'hero' && img.id !== 'profile_avatar'
  );

  return (
    <div className="space-y-8">
       <Alert variant="default" className="bg-amber-50 border-amber-200">
        <Construction className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-semibold">Funcionalidade em Desenvolvimento</AlertTitle>
        <AlertDescription className="text-amber-700">
          A funcionalidade de upload de imagens e gerenciamento de galeria ainda não está implementada. A integração com o Firebase Storage é necessária para habilitar o upload, armazenamento e recuperação de novas imagens. Por enquanto, a galeria exibe as imagens estáticas do projeto.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Enviar Nova Imagem</CardTitle>
          <CardDescription>
            Faça o upload de uma nova imagem para ser usada nos serviços e promoções.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          <Label htmlFor="picture" className="flex-1 w-full">
            <div className="flex items-center justify-center w-full">
              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Clique para fazer upload ou arraste e solte</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG or GIF (MAX. 800x400px)</p>
                  </div>
                  <Input id="picture" type="file" className="hidden" disabled />
              </div>
            </div>
          </Label>
          <Button disabled>
            <Upload className="mr-2 h-4 w-4" /> Enviar Imagem
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Galeria de Imagens</CardTitle>
          <CardDescription>Imagens disponíveis para uso no site.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((img) => (
              <div key={img.id} className="relative group aspect-square">
                <Image
                  src={img.imageUrl}
                  alt={img.description}
                  fill
                  className="object-cover rounded-md"
                />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-white text-xs text-center p-2">{img.description}</p>
                 </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
