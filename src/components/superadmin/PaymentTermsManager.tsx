import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Plus, FileText, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { usePaymentTerms, type PaymentTermsClause } from '@/hooks/usePaymentTerms';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEFAULT_CLAUSES: PaymentTermsClause[] = [
  {
    id: 'clause_1',
    title: 'Natureza da Plataforma',
    content: 'A plataforma NÃO é uma instituição financeira. Atuamos apenas como intermediadores tecnológicos entre o lojista e os gateways de pagamento parceiros.',
  },
  {
    id: 'clause_2',
    title: 'Responsabilidade por Estornos',
    content: 'A plataforma NÃO se responsabiliza por estornos (refunds) solicitados pelos clientes finais. A gestão de estornos é de responsabilidade exclusiva do lojista junto ao gateway de pagamento.',
  },
  {
    id: 'clause_3',
    title: 'Responsabilidade por Chargebacks',
    content: 'A plataforma NÃO se responsabiliza por chargebacks (contestações de cartão). O lojista assume total responsabilidade por disputas originadas de suas transações.',
  },
  {
    id: 'clause_4',
    title: 'Responsabilidade por Vendas',
    content: 'A plataforma NÃO se responsabiliza pelas vendas realizadas pelo lojista, incluindo qualidade de produtos, entregas, atendimento ao cliente ou quaisquer obrigações comerciais.',
  },
  {
    id: 'clause_5',
    title: 'Taxa Operacional',
    content: 'A plataforma pode cobrar uma taxa operacional por transação processada, conforme o plano contratado e método de pagamento utilizado. As taxas vigentes são exibidas no painel do lojista.',
  },
];

export function PaymentTermsManager() {
  const { allTerms, isLoading, createTerms, updateTerms } = usePaymentTerms();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerms, setEditingTerms] = useState<typeof allTerms extends (infer T)[] ? T : never | null>(null);
  
  const [formData, setFormData] = useState({
    version: '',
    title: 'Termos de Pagamento e Taxas Operacionais',
    content: 'Ao utilizar os serviços de pagamento integrados à plataforma, o lojista concorda com os termos descritos abaixo.',
    clauses: DEFAULT_CLAUSES,
    is_active: false,
  });

  const handleOpenCreate = () => {
    setEditingTerms(null);
    setFormData({
      version: '',
      title: 'Termos de Pagamento e Taxas Operacionais',
      content: 'Ao utilizar os serviços de pagamento integrados à plataforma, o lojista concorda com os termos descritos abaixo.',
      clauses: DEFAULT_CLAUSES,
      is_active: false,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (terms: any) => {
    setEditingTerms(terms);
    setFormData({
      version: terms.version,
      title: terms.title,
      content: terms.content,
      clauses: terms.clauses || DEFAULT_CLAUSES,
      is_active: terms.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleClauseChange = (index: number, field: 'title' | 'content', value: string) => {
    const newClauses = [...formData.clauses];
    newClauses[index] = { ...newClauses[index], [field]: value };
    setFormData({ ...formData, clauses: newClauses });
  };

  const handleAddClause = () => {
    const newId = `clause_${formData.clauses.length + 1}`;
    setFormData({
      ...formData,
      clauses: [...formData.clauses, { id: newId, title: '', content: '' }],
    });
  };

  const handleRemoveClause = (index: number) => {
    const newClauses = formData.clauses.filter((_, i) => i !== index);
    setFormData({ ...formData, clauses: newClauses });
  };

  const handleSubmit = () => {
    if (editingTerms) {
      updateTerms.mutate(
        { id: editingTerms.id, ...formData },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    } else {
      createTerms.mutate(formData, {
        onSuccess: () => setIsDialogOpen(false),
      });
    }
  };

  const handleActivate = (terms: any) => {
    updateTerms.mutate({ id: terms.id, is_active: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Termos de Pagamento
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie os termos e condições que os lojistas devem aceitar
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Versão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTerms ? 'Editar Termos' : 'Criar Nova Versão dos Termos'}
              </DialogTitle>
              <DialogDescription>
                Defina o conteúdo e as cláusulas dos termos de pagamento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="version">Versão</Label>
                  <Input
                    id="version"
                    placeholder="Ex: 2.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
                <div className="space-y-2 flex items-center gap-4">
                  <Label htmlFor="is_active">Ativar ao salvar?</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Introdução</Label>
                <Textarea
                  id="content"
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cláusulas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddClause}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                <Accordion type="multiple" className="space-y-2">
                  {formData.clauses.map((clause, index) => (
                    <AccordionItem key={clause.id} value={clause.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{index + 1}.</span>
                          <span>{clause.title || 'Nova Cláusula'}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-4">
                        <div className="space-y-2">
                          <Label>Título da Cláusula</Label>
                          <Input
                            value={clause.title}
                            onChange={(e) => handleClauseChange(index, 'title', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Conteúdo</Label>
                          <Textarea
                            rows={3}
                            value={clause.content}
                            onChange={(e) => handleClauseChange(index, 'content', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveClause(index)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createTerms.isPending || updateTerms.isPending}>
                {(createTerms.isPending || updateTerms.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingTerms ? 'Salvar Alterações' : 'Criar Termos'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Terms List */}
      <Card>
        <CardHeader>
          <CardTitle>Versões dos Termos</CardTitle>
          <CardDescription>
            Histórico de todas as versões dos termos de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allTerms && allTerms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Publicado em</TableHead>
                  <TableHead>Cláusulas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTerms.map((terms: any) => (
                  <TableRow key={terms.id}>
                    <TableCell className="font-mono">{terms.version}</TableCell>
                    <TableCell className="font-medium">{terms.title}</TableCell>
                    <TableCell>
                      {terms.is_active ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {terms.published_at
                        ? format(new Date(terms.published_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>{terms.clauses?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(terms)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!terms.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(terms)}
                          >
                            Ativar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhum termo de pagamento cadastrado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
