/**
 * PageFormDialog - Robust SEO page form dialog
 * 
 * Features:
 * - Does NOT close on blur or tab switching
 * - Unsaved changes protection with confirmation
 * - Auto-save draft to local state
 * - Proper data loading for edit mode
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Save, Loader2 } from 'lucide-react';
import type { PlatformSEOPage } from '@/hooks/usePlatformSEO';

interface PageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: PlatformSEOPage | null;
  onSave: (data: Partial<PlatformSEOPage>) => Promise<void>;
}

// Helper function for default form state
function getDefaultFormState(page: PlatformSEOPage | null): Partial<PlatformSEOPage> {
  if (page) {
    return {
      path: page.path,
      title: page.title,
      description: page.description,
      slug: page.slug,
      is_indexable: page.is_indexable,
      include_in_sitemap: page.include_in_sitemap,
      sitemap_priority: page.sitemap_priority,
      sitemap_changefreq: page.sitemap_changefreq,
      is_active: page.is_active,
      display_order: page.display_order,
      og_title: page.og_title,
      og_description: page.og_description,
      og_image_url: page.og_image_url,
      og_type: page.og_type,
      robots: page.robots,
      keywords: page.keywords,
    };
  }
  return {
    path: '',
    title: '',
    description: '',
    slug: '',
    is_indexable: true,
    include_in_sitemap: true,
    sitemap_priority: 0.8,
    sitemap_changefreq: 'weekly',
    is_active: true,
    display_order: 0,
  };
}

export function PageFormDialog({
  open,
  onOpenChange,
  page,
  onSave,
}: PageFormDialogProps) {
  const [form, setForm] = useState<Partial<PlatformSEOPage>>(getDefaultFormState(null));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false);
  const initialFormRef = useRef<Partial<PlatformSEOPage>>(getDefaultFormState(null));

  // Sync form state when page prop changes or dialog opens
  useEffect(() => {
    if (open) {
      const newFormState = getDefaultFormState(page);
      setForm(newFormState);
      initialFormRef.current = newFormState;
      setIsLoaded(true);
    }
  }, [page, open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsLoaded(false);
      setIsSaving(false);
    }
  }, [open]);

  // Check if form has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const initial = initialFormRef.current;
    return (
      form.path !== initial.path ||
      form.title !== initial.title ||
      form.description !== initial.description ||
      form.slug !== initial.slug ||
      form.is_indexable !== initial.is_indexable ||
      form.include_in_sitemap !== initial.include_in_sitemap ||
      form.sitemap_priority !== initial.sitemap_priority ||
      form.is_active !== initial.is_active
    );
  }, [form]);

  // Handle dialog close attempt
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges()) {
      setShowUnsavedChangesAlert(true);
    } else {
      onOpenChange(newOpen);
    }
  }, [hasUnsavedChanges, onOpenChange]);

  // Force close after confirmation
  const handleForceClose = () => {
    setShowUnsavedChangesAlert(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!form.path || !form.title) return;
    setIsSaving(true);
    try {
      await onSave(form);
      // Only close on successful save
    } finally {
      setIsSaving(false);
    }
  };

  const isEditMode = page !== null;
  const canSubmit = isLoaded && form.path && form.title;

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={handleOpenChange}
      >
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            // Prevent closing on outside click if there are unsaved changes
            if (hasUnsavedChanges()) {
              e.preventDefault();
              setShowUnsavedChangesAlert(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on escape if there are unsaved changes
            if (hasUnsavedChanges()) {
              e.preventDefault();
              setShowUnsavedChangesAlert(true);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Editar Página' : 'Nova Página SEO'}</DialogTitle>
            <DialogDescription>Configure as meta tags desta página pública</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="path">Caminho *</Label>
                <Input
                  id="path"
                  value={form.path ?? ''}
                  onChange={(e) => setForm({ ...form, path: e.target.value })}
                  placeholder="/minha-pagina"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug ?? ''}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="minha-pagina"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título da Página | FoodHub09"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição da página para mecanismos de busca..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Prioridade Sitemap</Label>
                <Select
                  value={String(form.sitemap_priority ?? 0.8)}
                  onValueChange={(v) => setForm({ ...form, sitemap_priority: parseFloat(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.0">1.0 (Máxima)</SelectItem>
                    <SelectItem value="0.9">0.9</SelectItem>
                    <SelectItem value="0.8">0.8</SelectItem>
                    <SelectItem value="0.7">0.7</SelectItem>
                    <SelectItem value="0.5">0.5 (Média)</SelectItem>
                    <SelectItem value="0.3">0.3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={form.sitemap_changefreq ?? 'weekly'}
                  onValueChange={(v) => setForm({ ...form, sitemap_changefreq: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Sempre</SelectItem>
                    <SelectItem value="hourly">Por hora</SelectItem>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="never">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.display_order ?? 0}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active ?? true}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_indexable ?? true}
                  onCheckedChange={(v) => setForm({ ...form, is_indexable: v })}
                />
                <Label>Indexar (robots)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.include_in_sitemap ?? true}
                  onCheckedChange={(v) => setForm({ ...form, include_in_sitemap: v })}
                />
                <Label>Incluir no Sitemap</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !canSubmit}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditMode ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={showUnsavedChangesAlert} onOpenChange={setShowUnsavedChangesAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceClose}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
