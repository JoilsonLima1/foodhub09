import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Save, ExternalLink, Check, X } from 'lucide-react';
import type { PixPspProvider } from '@/hooks/usePixAutomatico';

interface Props {
  providers: PixPspProvider[];
  onToggle: (id: string, active: boolean) => void;
  onUpdate: (updates: Partial<PixPspProvider> & { id: string }) => void;
}

export function PixPspProvidersTab({ providers, onToggle, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const handleEdit = (provider: PixPspProvider) => {
    setEditingId(provider.id);
    setEditValues({
      default_percent_fee: provider.default_percent_fee,
      default_fixed_fee: provider.default_fixed_fee,
    });
  };

  const handleSave = (id: string) => {
    onUpdate({ id, ...editValues });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {providers.map((psp) => (
          <Card key={psp.id} className={!psp.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{psp.display_name}</CardTitle>
                <Switch
                  checked={psp.is_active}
                  onCheckedChange={(v) => onToggle(psp.id, v)}
                />
              </div>
              <CardDescription className="text-xs">{psp.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Capabilities */}
              <div className="flex flex-wrap gap-1">
                {psp.supports_txid && <Badge variant="outline" className="text-xs"><Check className="h-3 w-3 mr-1" />TXID</Badge>}
                {psp.supports_webhook && <Badge variant="outline" className="text-xs"><Check className="h-3 w-3 mr-1" />Webhook</Badge>}
                {psp.supports_subaccount && <Badge variant="outline" className="text-xs"><Check className="h-3 w-3 mr-1" />Subconta</Badge>}
                {psp.supports_split && <Badge variant="outline" className="text-xs"><Check className="h-3 w-3 mr-1" />Split</Badge>}
                {!psp.supports_subaccount && <Badge variant="secondary" className="text-xs"><X className="h-3 w-3 mr-1" />Subconta</Badge>}
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Modelo: {psp.pricing_model}</Label>
                {editingId === psp.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">% Taxa</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={editValues.default_percent_fee}
                          onChange={(e) => setEditValues({ ...editValues, default_percent_fee: parseFloat(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">R$ Fixo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editValues.default_fixed_fee}
                          onChange={(e) => setEditValues({ ...editValues, default_fixed_fee: parseFloat(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(psp.id)}>
                        <Save className="h-3 w-3 mr-1" />Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {(psp.default_percent_fee * 100).toFixed(2)}%
                      {psp.default_fixed_fee > 0 && ` + R$ ${psp.default_fixed_fee.toFixed(2)}`}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(psp)}>Editar</Button>
                  </div>
                )}
              </div>

              {psp.api_docs_url && (
                <a href={psp.api_docs_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Documentação
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
