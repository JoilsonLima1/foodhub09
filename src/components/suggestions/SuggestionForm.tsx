import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquarePlus, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSuggestions, type SuggestionType } from '@/hooks/useSuggestions';

const suggestionSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido').max(255),
  whatsapp: z.string().max(20).optional(),
  organization_name: z.string().max(100).optional(),
  subject: z.string().min(5, 'Assunto deve ter pelo menos 5 caracteres').max(200),
  message: z.string().min(20, 'Mensagem deve ter pelo menos 20 caracteres').max(2000),
  suggestion_type: z.enum(['improvement', 'bug', 'feature', 'other']),
});

type SuggestionFormData = z.infer<typeof suggestionSchema>;

interface SuggestionFormProps {
  source: 'landing' | 'organization';
  tenantId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  organizationName?: string;
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'link';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
  triggerClassName?: string;
}

const suggestionTypeLabels: Record<SuggestionType, string> = {
  improvement: 'Melhoria',
  bug: 'Problema/Bug',
  feature: 'Nova Funcionalidade',
  other: 'Outro',
};

export function SuggestionForm({
  source,
  tenantId,
  userId,
  userName,
  userEmail,
  userPhone,
  organizationName,
  triggerVariant = 'outline',
  triggerSize = 'default',
  triggerClassName,
}: SuggestionFormProps) {
  const [open, setOpen] = useState(false);
  const { submitSuggestion, isSubmitting } = useSuggestions();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SuggestionFormData>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      name: userName || '',
      email: userEmail || '',
      whatsapp: userPhone || '',
      organization_name: organizationName || '',
      subject: '',
      message: '',
      suggestion_type: 'improvement',
    },
  });

  const suggestionType = watch('suggestion_type');

  const onSubmit = async (data: SuggestionFormData) => {
    const success = await submitSuggestion({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      suggestion_type: data.suggestion_type,
      whatsapp: data.whatsapp || undefined,
      organization_name: data.organization_name || undefined,
      source,
      tenant_id: tenantId,
      user_id: userId,
    });

    if (success) {
      reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClassName}>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Enviar Sugestão
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Enviar Sugestão
          </DialogTitle>
          <DialogDescription>
            Sua opinião é muito importante para nós! Envie sugestões de melhorias,
            relate problemas ou sugira novas funcionalidades.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="(11) 99999-9999"
                {...register('whatsapp')}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_name">Organização</Label>
              <Input
                id="organization_name"
                placeholder="Nome da empresa"
                {...register('organization_name')}
                disabled={isSubmitting || !!organizationName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestion_type">Tipo de Sugestão *</Label>
            <Select
              value={suggestionType}
              onValueChange={(value) => setValue('suggestion_type', value as SuggestionType)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(suggestionTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              placeholder="Resumo da sua sugestão"
              {...register('subject')}
              disabled={isSubmitting}
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              placeholder="Descreva sua sugestão em detalhes..."
              rows={4}
              {...register('message')}
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="text-xs text-destructive">{errors.message.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Sugestão
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
