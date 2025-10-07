
'use client';

import { useState, ChangeEvent, useMemo } from 'react';
import Image from 'next/image';
import { useFirestore, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, serverTimestamp, addDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
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
import { Upload, Image as ImageIcon, Trash2, X, CheckCircle, GripVertical, Loader2 } from 'lucide-react';
import type { GalleryImage } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

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

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const galleryImagesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'galleryImages') : null), [firestore]);
  const { data: images, isLoading: isLoadingImages } = useCollection<GalleryImage>(galleryImagesRef);

  const sortedImages = useMemo(() => {
    if (!images) return [];
    return [...images].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [images]);

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
    if (!galleryImagesRef || !storage) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar ao Firebase. Tente novamente.',
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
          description: `Ocorreu um erro: ${error.message}. Verifique as regras de armazenamento e a conexão.`,
        });
        setIsUploading(false);
        setUploadProgress(null);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then(downloadURL => {
            const docData = {
              imageUrl: downloadURL,
              description,
              fileName,
              createdAt: serverTimestamp(),
            };
            return addDoc(galleryImagesRef, docData);
          })
          .then(() => {
            toast({
              title: 'Upload Concluído!',
              description: 'A imagem foi adicionada à sua galeria.',
            });
            resetForm();
          })
          .catch(err => {
            console.error('Erro ao salvar no Firestore ou obter URL:', err);
            toast({
              variant: 'destructive',
              title: 'Erro ao Salvar Dados',
              description: `A imagem foi enviada, mas houve um erro ao salvá-la no banco de dados: ${err.message}`,
            });
            const contextualError = new FirestorePermissionError({
              path: galleryImagesRef.path,
              operation: 'create',
              requestResourceData: { description },
            });
            errorEmitter.emit('permission-error', contextualError);
          }).finally(() => {
              setIsUploading(false);
              setUploadProgress(null);
          });
      }
    );
  };
  
  const handleToggleSelection = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]
    );
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedImages([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.length === 0 || !firestore) {
      toast({
        title: 'Nenhuma imagem selecionada',
        variant: 'destructive'
      });
      return;
    }
    
    setIsDeleting(true);
    setShowDeleteAlert(false);

    try {
      const batch = writeBatch(firestore);
      const deletePromises: Promise<void>[] = [];

      selectedImages.forEach(id => {
        const imageToDelete = images?.find(img => img.id === id);
        if (imageToDelete) {
          // Delete from Storage
          const imageRef = ref(storage, `gallery/${imageToDelete.fileName}`);
          deletePromises.push(deleteObject(imageRef));

          // Delete from Firestore
          const docRef = doc(firestore, 'galleryImages', id);
          batch.delete(docRef);
        }
      });
      
      // Execute all deletions
      await Promise.all(deletePromises);
      await batch.commit();

      toast({
        title: 'Imagens Excluídas!',
        description: `${selectedImages.length} imagem(ns) foram removidas com sucesso.`
      });

    } catch (error) {
        console.error("Error deleting images:", error);
        toast({
          title: 'Erro ao Excluir',
          description: 'Não foi possível excluir as imagens. Verifique as permissões e tente novamente.',
          variant: 'destructive'
        });
    } finally {
        setIsDeleting(false);
        handleCancelSelection();
    }
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
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? `Enviando...` : 'Enviar Imagem'}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Galeria de Imagens</CardTitle>
            <CardDescription>Imagens disponíveis para uso no site.</CardDescription>
          </div>
          {selectionMode ? (
             <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={() => setShowDeleteAlert(true)} disabled={selectedImages.length === 0 || isDeleting}>
                   {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Excluir ({selectedImages.length})
                </Button>
                <Button variant="outline" onClick={handleCancelSelection} disabled={isDeleting}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
             </div>
          ) : (
            <Button variant="outline" onClick={() => setSelectionMode(true)} disabled={!images || images.length === 0}>
                <GripVertical className="mr-2 h-4 w-4" />
                Selecionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {isLoadingImages && Array.from({length: 5}).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
            {sortedImages?.map((img) => {
              const isSelected = selectedImages.includes(img.id);
              return (
              <div 
                key={img.id} 
                className={cn(
                  "relative group aspect-square rounded-md overflow-hidden",
                  selectionMode && "cursor-pointer",
                  isSelected && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => selectionMode && handleToggleSelection(img.id)}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.description}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                 <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-white text-xs text-center">{img.description}</p>
                 </div>
                 {selectionMode && (
                    <div className={cn(
                      "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-white/50 backdrop-blur-sm"
                    )}>
                      {isSelected && <CheckCircle className="w-5 h-5" />}
                    </div>
                  )}
              </div>
            )})}
             {!isLoadingImages && images?.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8">
                    Sua galeria está vazia. Comece enviando sua primeira imagem!
                </p>
             )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                   Esta ação não pode ser desfeita. Isso removerá permanentemente as {selectedImages.length} imagens selecionadas do Firebase Storage e do banco de dados.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                    Sim, excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
