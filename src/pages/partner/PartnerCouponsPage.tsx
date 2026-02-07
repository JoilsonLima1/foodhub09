/**
 * PartnerCouponsPage - CRUD for partner coupons
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useState } from 'react';
import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Ticket, Loader2 } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { usePartnerCoupons, PartnerCoupon } from '@/hooks/usePartnerCoupons';
import { format } from 'date-fns';

export default function PartnerCouponsPage() {
  const { partner } = usePartnerData();
  const { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon, isCreating } = usePartnerCoupons(partner?.id);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PartnerCoupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 10,
    max_redemptions: undefined as number | undefined,
    max_redemptions_per_tenant: 1,
    valid_to: '',
    applies_to: 'any' as 'plan' | 'addon' | 'any',
  });

  const handleOpenDialog = (coupon?: PartnerCoupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setForm({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_redemptions: coupon.max_redemptions || undefined,
        max_redemptions_per_tenant: coupon.max_redemptions_per_tenant || 1,
        valid_to: coupon.valid_to ? coupon.valid_to.split('T')[0] : '',
        applies_to: coupon.applies_to,
      });
    } else {
      setEditingCoupon(null);
      setForm({ code: '', description: '', discount_type: 'percent', discount_value: 10, max_redemptions: undefined, max_redemptions_per_tenant: 1, valid_to: '', applies_to: 'any' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!partner) return;
    
    if (editingCoupon) {
      await updateCoupon({ id: editingCoupon.id, ...form, valid_to: form.valid_to || undefined });
    } else {
      await createCoupon({ partner_id: partner.id, ...form, valid_to: form.valid_to || undefined });
    }
    setIsDialogOpen(false);
  };

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Cupons de Desconto
            </h1>
            <p className="text-muted-foreground">Crie cupons promocionais para seus clientes</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cupom
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seus Cupons</CardTitle>
            <CardDescription>Cupons ativos e histórico de uso</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cupom criado ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Aplica-se a</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => {
                    const isExpired = coupon.valid_to && new Date(coupon.valid_to) < new Date();
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>
                          {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value.toFixed(2)}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {coupon.applies_to === 'plan' ? 'Planos' : coupon.applies_to === 'addon' ? 'Add-ons' : 'Todos'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coupon.redemptions_count || 0}
                          {coupon.max_redemptions && ` / ${coupon.max_redemptions}`}
                        </TableCell>
                        <TableCell>
                          {coupon.valid_to ? format(new Date(coupon.valid_to), 'dd/MM/yyyy') : 'Sem limite'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? 'secondary' : coupon.is_active ? 'default' : 'secondary'}>
                            {isExpired ? 'Expirado' : coupon.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(coupon)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteCoupon(coupon.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
              <DialogDescription>Configure os detalhes do cupom</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EX: PROMO20" />
                </div>
                <div className="space-y-2">
                  <Label>Aplica-se a</Label>
                  <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Todos</SelectItem>
                      <SelectItem value="plan">Apenas Planos</SelectItem>
                      <SelectItem value="addon">Apenas Add-ons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máx. Usos Total</Label>
                  <Input type="number" value={form.max_redemptions || ''} onChange={(e) => setForm({ ...form, max_redemptions: parseInt(e.target.value) || undefined })} placeholder="Ilimitado" />
                </div>
                <div className="space-y-2">
                  <Label>Válido até</Label>
                  <Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isCreating || !form.code}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PartnerLayout>
  );
}
