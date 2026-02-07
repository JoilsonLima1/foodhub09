import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Trash2,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { usePartnerDomains } from '@/hooks/usePartners';
import { useToast } from '@/hooks/use-toast';

interface PartnerDomainsPanelProps {
  partnerId: string;
}

export function PartnerDomainsPanel({ partnerId }: PartnerDomainsPanelProps) {
  const { domains, isLoading, addDomain, verifyDomain, setPrimary, deleteDomain } = usePartnerDomains(partnerId);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const handleAdd = async () => {
    if (!newDomain) return;
    await addDomain.mutateAsync(newDomain);
    setNewDomain('');
    setIsDialogOpen(false);
  };

  const handleVerify = async (domainId: string) => {
    await verifyDomain.mutateAsync(domainId);
  };

  const handleSetPrimary = async (domainId: string) => {
    await setPrimary.mutateAsync(domainId);
  };

  const handleDelete = async (domainId: string) => {
    if (confirm('Remover este domínio?')) {
      await deleteDomain.mutateAsync(domainId);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const getStatusBadge = (domain: any) => {
    if (domain.is_verified) {
      return (
        <Badge variant="default">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verificado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const getSSLBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline">SSL Ativo</Badge>;
      case 'failed':
        return <Badge variant="destructive">SSL Falhou</Badge>;
      default:
        return <Badge variant="secondary">SSL Pendente</Badge>;
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Domínios do Parceiro
              </CardTitle>
              <CardDescription>
                Configure domínios personalizados para a plataforma white-label
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Domínio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Domínio</DialogTitle>
                  <DialogDescription>
                    Adicione um domínio personalizado para o parceiro
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Domínio</Label>
                    <Input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="app.parceiro.com.br"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAdd} disabled={!newDomain}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum domínio configurado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead>Token de Verificação</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{domain.domain}</span>
                        {domain.is_primary && (
                          <Badge variant="outline">
                            <Star className="h-3 w-3 mr-1" />
                            Principal
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(domain)}</TableCell>
                    <TableCell>{getSSLBadge(domain.ssl_status)}</TableCell>
                    <TableCell>
                      {!domain.is_verified && domain.verification_token && (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            _lovable TXT lovable_verify={domain.verification_token}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(`lovable_verify=${domain.verification_token}`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!domain.is_verified && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVerify(domain.id)}
                            title="Verificar DNS"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {domain.is_verified && !domain.is_primary && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetPrimary(domain.id)}
                            title="Definir como principal"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(domain.id)}
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

      {/* DNS Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Configuração DNS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para conectar um domínio personalizado, o parceiro deve configurar os seguintes registros DNS:
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
            <p><strong>Registro A:</strong> @ → 185.158.133.1</p>
            <p><strong>Registro A:</strong> www → 185.158.133.1</p>
            <p><strong>Registro TXT:</strong> _lovable → lovable_verify=TOKEN</p>
          </div>
          <p className="text-sm text-muted-foreground">
            A propagação DNS pode levar até 72 horas. O SSL será provisionado automaticamente após a verificação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
