import { useState, useCallback } from 'react';
import { Upload, X, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  description?: string;
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  removeBackground?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  label,
  description,
  bucket = 'branding',
  folder = 'logos',
  maxSizeMB = 10,
  removeBackground = true,
}: ImageUploaderProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);

  const processAndUpload = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: `O tamanho máximo é ${maxSizeMB}MB`,
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo inválido',
        description: 'Por favor, envie apenas imagens',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      let imageToUpload: Blob = file;

      // Remove background if enabled
      if (removeBackground) {
        setIsRemovingBg(true);
        try {
          const base64 = await fileToBase64(file);
          const { data, error } = await supabase.functions.invoke('remove-background', {
            body: { image: base64 },
          });

          if (error) throw error;

          if (data?.image) {
            // Convert base64 back to blob
            const response = await fetch(data.image);
            imageToUpload = await response.blob();
          }
        } catch (bgError) {
          console.error('Background removal failed:', bgError);
          toast({
            title: 'Aviso',
            description: 'Não foi possível remover o fundo. Usando imagem original.',
            variant: 'default',
          });
        }
        setIsRemovingBg(false);
      }

      // Resize image
      const resizedBlob = await resizeImage(imageToUpload, 512, 512);

      // Upload to storage
      const fileName = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, resizedBlob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onChange(publicUrl);

      toast({
        title: 'Imagem enviada',
        description: 'A imagem foi processada e salva com sucesso.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Falha ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setIsRemovingBg(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processAndUpload(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUpload(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-colors',
          'min-h-[200px] flex items-center justify-center',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3 p-6">
            {isRemovingBg ? (
              <>
                <Wand2 className="h-10 w-10 animate-pulse text-primary" />
                <span className="text-sm text-muted-foreground">Removendo fundo com IA...</span>
              </>
            ) : (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Processando imagem...</span>
              </>
            )}
          </div>
        ) : previewUrl ? (
          <div className="relative w-full h-full min-h-[200px] p-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain max-h-[180px]"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-3 p-6 cursor-pointer w-full h-full">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <span className="text-sm font-medium text-foreground">
                Arraste uma imagem aqui
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                ou clique para selecionar (máx {maxSizeMB}MB)
              </p>
              {removeBackground && (
                <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1">
                  <Wand2 className="h-3 w-3" />
                  Remoção automática de fundo com IA
                </p>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// Helper functions
async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function resizeImage(blob: Blob, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Could not create blob'));
          }
        },
        'image/png',
        0.9
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
