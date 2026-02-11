import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import type { PixPspProvider, PixPricingPlan, PixAvailabilityRule } from '@/hooks/usePixAutomatico';

interface Props {
  rules: PixAvailabilityRule[];
  providers: PixPspProvider[];
  plans: PixPricingPlan[];
  onCreate: (rule: any) => void;
  onUpdate: (updates: Partial<PixAvailabilityRule> & { id: string }) => void;
  onDelete: (id: string) => void;
}

const SCOPE_LABELS: Record<string, string> = {
  global: 'Global',
  partner: 'Parceiro',
  tenant: 'Lojista',
  plan: 'Plano',
  category: 'Categoria',
};

const SCOPE_PRIORITY: Record<string, number> = {
  global: 1,
  category: 2,
  plan: 3,
  partner: 4,
  tenant: 5,
};

export function PixAvailabilityRulesTab({ rules, providers, plans, onCreate, onUpdate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    scope: 'global' as string,
    scope_id: '' as string,
    psp_provider_id: '' as string,
    pricing_plan_id: '' as string,
    is_enabled: true,
    notes: '',
  });

  const handleSubmit = () => {
    onCreate({
      scope: form.scope,
      scope_id: form.scope_id || null,
      psp_provider_id: form.psp_provider_id || null,
      pricing_plan_id: form.pricing_plan_id || null,
      priority: SCOPE_PRIORITY[form.scope] || 0,
      is_enabled: form.is_enabled,
      notes: form.notes || null,
    });
    setDialogOpen(false);
    setForm({ scope: 'global', scope_id: '', psp_provider_id: '', pricing_plan_id: '', is_enabled: true, notes: '' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Regras de Disponibilidade</CardTitle>
            <CardDescription>
              Motor de decisão: tenant → parceiro → plano → categoria → global
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Regra</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Regra de Disponibilidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Escopo</Label>
                    <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.scope !== 'global' && (
                    <div>
                      <Label>ID do Escopo</Label>
                      <Input
                        placeholder={form.scope === 'plan' ? 'slug do plano' : 'UUID ou identificador'}
                        value={form.scope_id}
                        onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label>PSP Provider</Label>
                  <Select value={form.psp_provider_id} onValueChange={(v) => setForm({ ...form, psp_provider_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plano de Preço PIX</Label>
                  <Select value={form.pricing_plan_id} onValueChange={(v) => setForm({ ...form, pricing_plan_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {plans.filter(p => p.is_active).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({(p.percent_rate * 100).toFixed(2)}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
                  <Label>Habilitada</Label>
                </div>
                <Button onClick={handleSubmit} className="w-full">Criar Regra</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Escopo</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>PSP</TableHead>
              <TableHead>Plano PIX</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Badge variant="outline">{SCOPE_LABELS[rule.scope] || rule.scope}</Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">{rule.scope_id || '—'}</TableCell>
                <TableCell>{rule.psp_provider?.display_name || '—'}</TableCell>
                <TableCell>{rule.pricing_plan?.name || '—'}</TableCell>
                <TableCell>{rule.priority}</TableCell>
                <TableCell>
                  <Switch
                    checked={rule.is_enabled}
                    onCheckedChange={(v) => onUpdate({ id: rule.id, is_enabled: v })}
                  />
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(rule.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma regra configurada. Crie uma regra global para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
