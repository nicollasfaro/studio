'use client';

import { useState, ChangeEvent } from 'react';
import Image from 'next/image';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useFirebaseApp } from '@/firebase';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, serverTimestamp } from 'firebase/firestore';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { GalleryImage } from '@/lib/types';

export default function AdminGalleryPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const app = useFirebaseApp(); 
  const storage = getStorage(app); 

  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const galleryImagesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'galleryImages') : null), [firestore]);
  const { data: images, isLoading: isLoadingImages } = useCollection<GalleryImage>(galleryImagesRef);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
            variant: 'destructive',
            title: 'Arquivo muito grande',
            description: 'Por favor, selecione uma imagem com menos de 5MB.',
        });
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const resetForm = () => {
    setFile(null);
    setDescription('');
    setPreviewUrl(null);
    setUploadProgress(null);
    setIsUploading(false);
    // Reset the file input visually
    const fileInput = document.getElementById('picture') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  }

  const handleUpload = () => {
    if (!file || !description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos Incompletos',
        description: 'Por favor, selecione um arquivo e forneça uma descrição.',
      });
      return;
    }
    if (!galleryImagesRef) {
        toast({
            variant: 'destructive',
            title: 'Erro de Conexão',
            description: 'Não foi possível conectar ao banco de dados. Tente novamente.',
        });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileName = `${new Date().getTime()}_${file.name}`;
    const storageRef = ref(storage, `gallery/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Erro no upload:', error);
        toast({
          variant: 'destructive',
          title: 'Erro no Upload',
          description: `Ocorreu um erro: ${error.code}. Verifique as regras de armazenamento e a conexão.`,
        });
        resetForm();
      },
      () => {
        // Upload completed successfully, now get the download URL
        getDownloadURL(uploadTask.snapshot.ref).then(downloadURL => {
            // Save metadata to Firestore
            addDocumentNonBlocking(galleryImagesRef, {
              imageUrl: downloadURL,
              description: description,
              fileName: fileName,
              createdAt: serverTimestamp(),
            }).then(() => {
                toast({
                    title: 'Upload Concluído!',
                    description: 'A imagem foi adicionada à sua galeria.',
                });
            }).catch(dbError => {
                console.error('Erro ao salvar no Firestore:', dbError);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao Salvar Dados',
                    description: 'A imagem foi enviada, mas houve um erro ao salvá-la na galeria.',
                });
            }).finally(() => {
                resetForm();
            });
        }).catch(urlError => {
            console.error('Erro ao obter URL de download:', urlError);
            toast({
                variant: 'destructive',
                title: 'Erro Pós-Upload',
                description: 'Não foi possível obter a URL da imagem após o upload.',
            });
            resetForm();
        });
      }
    );
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Enviar Nova Imagem</CardTitle>
          <CardDescription>
            Faça o upload de uma nova imagem (PNG, JPG, WEBP, até 5MB) para ser usada nos serviços e promoções.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-6 items-start">
             <Label htmlFor="picture" className="cursor-pointer">
              <div className="flex items-center justify-center w-full">
                <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg bg-muted hover:bg-muted/80">
                  {previewUrl ? (
                     <Image src={previewUrl} alt="Preview" width={192} height={192} className="h-full w-auto object-contain rounded-lg p-2" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                        <ImageIcon className="w-10 h-10 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (max. 5MB)</p>
                    </div>
                  )}
                    <Input id="picture" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" disabled={isUploading} />
                </div>
              </div>
            </Label>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="description">Descrição da Imagem</Label>
                    <Input id="description" placeholder="Ex: Corte de cabelo feminino moderno" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isUploading}/>
                </div>
                <Button onClick={handleUpload} disabled={isUploading || !file || !description.trim()}>
                    <Upload className="mr-2 h-4 w-4" /> {isUploading ? `Enviando...` : 'Enviar Imagem'}
                </Button>
                 {isUploading && uploadProgress !== null && (
                    <div className="space-y-1">
                        <Progress value={uploadProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
                    </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Galeria de Imagens</CardTitle>
          <CardDescription>Imagens disponíveis para uso no site. O upload direto no Firebase Storage não reflete aqui; use o formulário acima.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {isLoadingImages && Array.from({length: 5}).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
            {images?.map((img) => (
              <div key={img.id} className="relative group aspect-square">
                <Image
                  src={img.imageUrl}
                  alt={img.description}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  className="object-cover rounded-md"
                />
                 <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-white text-xs text-center mb-2">{img.description}</p>
                   {/* Adicionar botão de deletar seria um próximo passo lógico aqui */}
                 </div>
              </div>
            ))}
             {!isLoadingImages && images?.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8">
                    Sua galeria está vazia. Comece enviando sua primeira imagem!
                </p>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
