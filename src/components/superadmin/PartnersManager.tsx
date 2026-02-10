import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
  Plus,
  Building2,
  Globe,
  Palette,
  Users,
  Settings,
  Edit,
  Trash2,
  ExternalLink,
  Store,
  Shield,
} from 'lucide-react';
import { usePartners, Partner } from '@/hooks/usePartners';
import { PartnerBrandingPanel } from './PartnerBrandingPanel';
import { PartnerDomainsPanel } from './PartnerDomainsPanel';
import { PartnerTenantsPanel } from './PartnerTenantsPanel';
import { PartnerPolicyOverridesPanel } from './PartnerPolicyOverridesPanel';

export function PartnersManager() {
  const { partners, isLoading, stats, createPartner, updatePartner, deletePartner } = usePartners();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    document: '',
    max_tenants: 10,
    max_users_per_tenant: 5,
    revenue_share_percent: 0,
    notes: '',
  });

  const handleOpenCreate = () => {
    setEditingPartner(null);
    setFormData({
      name: '',
      slug: '',
      email: '',
      phone: '',
      document: '',
      max_tenants: 10,
      max_users_per_tenant: 5,
      revenue_share_percent: 0,
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      slug: partner.slug,
      email: partner.email,
      phone: partner.phone || '',
      document: partner.document || '',
      max_tenants: partner.max_tenants,
      max_users_per_tenant: partner.max_users_per_tenant,
      revenue_share_percent: partner.revenue_share_percent,
      notes: partner.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingPartner) {
      await updatePartner.mutateAsync({ id: editingPartner.id, ...formData });
    } else {
      await createPartner.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este parceiro? Esta ação é irreversível.')) {
      await deletePartner.mutateAsync(id);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

  if (selectedPartner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setSelectedPartnerId(null)}>
              ← Voltar
            </Button>
            <div>
              <h2 className="text-xl font-bold">{selectedPartner.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedPartner.email}</p>
            </div>
            <Badge variant={selectedPartner.is_active ? 'default' : 'secondary'}>
              {selectedPartner.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <Button variant="outline" onClick={() => handleOpenEdit(selectedPartner)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>

        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="domains" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Domínios
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Lojas
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <PartnerBrandingPanel partnerId={selectedPartner.id} />
          </TabsContent>

          <TabsContent value="domains">
            <PartnerDomainsPanel partnerId={selectedPartner.id} />
          </TabsContent>

          <TabsContent value="permissions">
            <PartnerPolicyOverridesPanel partnerId={selectedPartner.id} />
          </TabsContent>

          <TabsContent value="tenants">
            <PartnerTenantsPanel partnerId={selectedPartner.id} />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Parceiro</CardTitle>
                <CardDescription>Limites, comissões e outras configurações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Limite de Lojas</Label>
                    <p className="text-2xl font-bold">{selectedPartner.max_tenants}</p>
                  </div>
                  <div>
                    <Label>Usuários por Loja</Label>
                    <p className="text-2xl font-bold">{selectedPartner.max_users_per_tenant}</p>
                  </div>
                  <div>
                    <Label>Comissão (Revenue Share)</Label>
                    <p className="text-2xl font-bold">{selectedPartner.revenue_share_percent}%</p>
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <p className="text-lg">{selectedPartner.document || '—'}</p>
                  </div>
                </div>

                {selectedPartner.notes && (
                  <div>
                    <Label>Observações</Label>
                    <p className="text-muted-foreground">{selectedPartner.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Parceiro</DialogTitle>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  function renderForm() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  name: e.target.value,
                  slug: editingPartner ? formData.slug : generateSlug(e.target.value),
                });
              }}
              placeholder="Nome do parceiro"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug *</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="parceiro-slug"
              disabled={!!editingPartner}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@parceiro.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input
            value={formData.document}
            onChange={(e) => setFormData({ ...formData, document: e.target.value })}
            placeholder="00.000.000/0001-00"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Limite de Lojas</Label>
            <Input
              type="number"
              min={1}
              value={formData.max_tenants}
              onChange={(e) => setFormData({ ...formData, max_tenants: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Usuários/Loja</Label>
            <Input
              type="number"
              min={1}
              value={formData.max_users_per_tenant}
              onChange={(e) => setFormData({ ...formData, max_users_per_tenant: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Comissão %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={formData.revenue_share_percent}
              onChange={(e) => setFormData({ ...formData, revenue_share_percent: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.slug || !formData.email}
          >
            {editingPartner ? 'Salvar' : 'Criar Parceiro'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Parceiros</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lojas Vinculadas</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">Em todos os parceiros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ativação</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Parceiros ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Parceiros White-label
              </CardTitle>
              <CardDescription>
                Gerencie parceiros que operam a plataforma com sua própria marca
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen && !editingPartner} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Parceiro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo Parceiro</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo parceiro white-label
                  </DialogDescription>
                </DialogHeader>
                {renderForm()}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : partners.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum parceiro cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Domínios</TableHead>
                  <TableHead>Lojas</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{partner.name}</p>
                        <p className="text-sm text-muted-foreground">{partner.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{partner.domains?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span>{partner.tenant_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>{partner.revenue_share_percent}%</TableCell>
                    <TableCell>
                      <Badge variant={partner.is_active ? 'default' : 'secondary'}>
                        {partner.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPartnerId(partner.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(partner.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
