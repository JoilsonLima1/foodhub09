import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCategoryContext } from '@/contexts/BusinessCategoryContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ProductImageUploader } from '@/components/products/ProductImageUploader';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSuccess: () => void;
  editProduct?: {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
    image_url: string | null;
    category_id: string | null;
    is_available: boolean;
  } | null;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  categories,
  onSuccess,
  editProduct,
}: ProductFormDialogProps) {
  const { tenantId } = useAuth();
  const { t } = useBusinessCategoryContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(editProduct?.name || '');
  const [description, setDescription] = useState(editProduct?.description || '');
  const [basePrice, setBasePrice] = useState(editProduct?.base_price?.toString() || '');
  const [imageUrl, setImageUrl] = useState<string | null>(editProduct?.image_url || null);
  const [categoryId, setCategoryId] = useState(editProduct?.category_id || '');
  const [isAvailable, setIsAvailable] = useState(editProduct?.is_available ?? true);

  // Reset form when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form
      setName('');
      setDescription('');
      setBasePrice('');
      setImageUrl(null);
      setCategoryId('');
      setIsAvailable(true);
    } else if (editProduct) {
      // Populate with edit data
      setName(editProduct.name);
      setDescription(editProduct.description || '');
      setBasePrice(editProduct.base_price.toString());
      setImageUrl(editProduct.image_url);
      setCategoryId(editProduct.category_id || '');
      setIsAvailable(editProduct.is_available);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name || !basePrice) return;

    setIsSubmitting(true);
    try {
      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        base_price: parseFloat(basePrice),
        image_url: imageUrl,
        category_id: categoryId || null,
        is_available: isAvailable,
        tenant_id: tenantId,
      };

      if (editProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProduct.id);

        if (error) throw error;

        toast({
          title: 'Produto atualizado',
          description: `${name} foi atualizado com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;

        toast({
          title: 'Produto criado',
          description: `${name} foi adicionado ao catálogo.`,
        });
      }

      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o produto.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editProduct ? `Editar ${t('product')}` : `Novo ${t('product')}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          {tenantId && (
            <ProductImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              productName={name || t('product')}
              tenantId={tenantId}
            />
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Nome do ${t('product').toLowerCase()}`}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
              rows={3}
            />
          </div>

          {/* Price and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('category')}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Availability */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Disponível para venda</Label>
              <p className="text-sm text-muted-foreground">
                O {t('product').toLowerCase()} aparecerá no PDV e cardápio
              </p>
            </div>
            <Switch
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name || !basePrice}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editProduct ? (
                'Salvar Alterações'
              ) : (
                `Criar ${t('product')}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
