import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, FileText, Shield, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LegalDoc {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  requires_scroll: boolean;
  created_at: string;
}

export function LegalDocumentsManager() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<LegalDoc | null>(null);
  const [form, setForm] = useState({
    type: 'marketplace_payment_terms',
    version: '',
    title: '',
    content: '',
    requires_scroll: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .order('type')
      .order('created_at', { ascending: false });

    if (!error && data) setDocs(data as any[]);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.version || !form.title || !form.content) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSaving(true);

    // Deactivate previous versions of same type
    await supabase
      .from('legal_documents')
      .update({ is_active: false })
      .eq('type', form.type)
      .eq('is_active', true);

    const { error } = await supabase
      .from('legal_documents')
      .insert({
        type: form.type,
        version: form.version,
        title: form.title,
        content: form.content,
        is_active: true,
        requires_scroll: form.requires_scroll,
      });

    if (error) {
      toast.error('Erro ao criar documento');
      console.error(error);
    } else {
      toast.success('Documento criado! Tenants precisarão aceitar a nova versão.');
      setDialogOpen(false);
      setForm({ type: 'marketplace_payment_terms', version: '', title: '', content: '', requires_scroll: true });
      loadDocs();
    }
    setSaving(false);
  }

  async function toggleActive(doc: LegalDoc) {
    const { error } = await supabase
      .from('legal_documents')
      .update({ is_active: !doc.is_active })
      .eq('id', doc.id);

    if (!error) {
      toast.success(doc.is_active ? 'Documento desativado' : 'Documento ativado');
      loadDocs();
    }
  }

  const typeLabels: Record<string, string> = {
    marketplace_payment_terms: 'Contrato Marketplace',
    privacy_policy: 'Política de Privacidade',
    split_agreement: 'Contrato de Split',
    payment_terms: 'Termos de Pagamento',
    terms: 'Termos de Uso',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Documentos Legais
            </CardTitle>
            <CardDescription>
              Gerencie contratos, termos e políticas. Ao criar nova versão, tenants precisarão aceitar novamente.
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Versão
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[doc.type] || doc.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{doc.title}</TableCell>
                  <TableCell>v{doc.version}</TableCell>
                  <TableCell>
                    {doc.is_active ? (
                      <Badge className="bg-primary/10 text-primary text-xs">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setViewDoc(doc)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(doc)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum documento legal cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Versão do Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketplace_payment_terms">Contrato Marketplace</SelectItem>
                    <SelectItem value="privacy_policy">Política de Privacidade</SelectItem>
                    <SelectItem value="split_agreement">Contrato de Split</SelectItem>
                    <SelectItem value="payment_terms">Termos de Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Versão</Label>
                <Input
                  placeholder="Ex: 2.0"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Ex: Contrato de Intermediação Tecnológica v2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                rows={12}
                placeholder="Texto completo do documento..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.requires_scroll}
                onCheckedChange={(v) => setForm({ ...form, requires_scroll: v })}
              />
              <Label>Exigir scroll até o final para aceitar</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar e Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewDoc?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border rounded-lg p-4 max-h-96 overflow-y-auto">
            {viewDoc?.content}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDoc(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
