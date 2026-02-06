import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Plus, Trash2, RefreshCw, Shield, Star, Copy, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useOrganizationDomains, OrganizationDomain } from '@/hooks/useOrganizationDomains';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DomainsManager() {
  const { toast } = useToast();
  const { domains, isLoading, addDomain, deleteDomain, verifyDomain, setPrimary } = useOrganizationDomains();
  const { organizations } = useOrganizations();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState({
    tenant_id: '',
    domain: '',
    domain_type: 'custom' as 'subdomain' | 'custom',
  });

  const handleAddDomain = async () => {
    if (!newDomain.tenant_id || !newDomain.domain) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione uma organização e informe o domínio.',
        variant: 'destructive',
      });
      return;
    }

    await addDomain.mutateAsync(newDomain);
    setIsAddOpen(false);
    setNewDomain({ tenant_id: '', domain: '', domain_type: 'custom' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'Token copiado para a área de transferência.',
    });
  };

  const getStatusBadge = (domain: OrganizationDomain) => {
    if (domain.is_verified) {
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> Verificado</Badge>;
    }
    if (domain.dns_configured) {
      return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" /> Aguardando SSL</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground border-muted-foreground"><AlertTriangle className="h-3 w-3 mr-1" /> Pendente DNS</Badge>;
  };

  const getSSLBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default"><Shield className="h-3 w-3 mr-1" /> SSL Ativo</Badge>;
      case 'issuing':
        return <Badge variant="outline" className="text-primary border-primary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Emitindo</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Gerenciamento de Domínios
            </CardTitle>
            <CardDescription>
              Configure domínios personalizados e subdomínios para as organizações
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Domínio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Domínio</DialogTitle>
                <DialogDescription>
                  Configure um domínio personalizado ou subdomínio para uma organização.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Select
                    value={newDomain.tenant_id}
                    onValueChange={(value) => setNewDomain({ ...newDomain, tenant_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma organização" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Domínio</Label>
                  <Select
                    value={newDomain.domain_type}
                    onValueChange={(value: 'subdomain' | 'custom') => setNewDomain({ ...newDomain, domain_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subdomain">Subdomínio (org.plataforma.com)</SelectItem>
                      <SelectItem value="custom">Domínio Próprio (www.exemplo.com.br)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Domínio</Label>
                  <Input
                    placeholder={newDomain.domain_type === 'subdomain' ? 'minha-loja' : 'www.minhaloja.com.br'}
                    value={newDomain.domain}
                    onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                  />
                  {newDomain.domain_type === 'subdomain' && (
                    <p className="text-xs text-muted-foreground">
                      O domínio final será: {newDomain.domain || 'exemplo'}.plataforma.com
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddDomain} disabled={addDomain.isPending}>
                  {addDomain.isPending ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando domínios...</div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum domínio configurado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead>Token de Verificação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {domain.is_primary && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Star className="h-4 w-4 text-primary fill-primary" />
                              </TooltipTrigger>
                              <TooltipContent>Domínio Principal</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {domain.domain}
                      </div>
                    </TableCell>
                    <TableCell>{domain.tenant?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {domain.domain_type === 'subdomain' ? 'Subdomínio' : 'Personalizado'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(domain)}</TableCell>
                    <TableCell>{getSSLBadge(domain.ssl_status)}</TableCell>
                    <TableCell>
                      {domain.verification_token && !domain.is_verified ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate">
                            {domain.verification_token.substring(0, 12)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(domain.verification_token!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!domain.is_verified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => verifyDomain.mutate(domain.id)}
                                  disabled={verifyDomain.isPending}
                                >
                                  <RefreshCw className={`h-4 w-4 ${verifyDomain.isPending ? 'animate-spin' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Verificar DNS</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!domain.is_primary && domain.is_verified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPrimary.mutate({ id: domain.id, tenantId: domain.tenant_id })}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Definir como Principal</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Domínio</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o domínio <strong>{domain.domain}</strong>? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDomain.mutate(domain.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DNS Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instruções de Configuração DNS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Para Domínios Personalizados</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Adicione um registro <strong>A</strong> apontando para:</p>
                <code className="block bg-muted px-2 py-1 rounded">185.158.133.1</code>
                <p>2. Adicione um registro <strong>TXT</strong> para verificação:</p>
                <code className="block bg-muted px-2 py-1 rounded">_lovable-verify.seudominio.com</code>
                <p>3. O valor do TXT deve ser o token de verificação exibido na tabela.</p>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Para Subdomínios</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Adicione um registro <strong>CNAME</strong>:</p>
                <code className="block bg-muted px-2 py-1 rounded">seusubdominio.plataforma.com</code>
                <p>2. Aponte para:</p>
                <code className="block bg-muted px-2 py-1 rounded">proxy.plataforma.com</code>
                <p>3. O SSL será configurado automaticamente após a propagação DNS.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
