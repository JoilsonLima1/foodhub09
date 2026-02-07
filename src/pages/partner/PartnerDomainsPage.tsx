/**
 * PartnerDomains - Manage partner custom domains
 */

import { useState } from 'react';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerDomains } from '@/hooks/usePartners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Star, 
  Trash2, 
  Loader2,
  Copy,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PartnerDomainsPage() {
  const { toast } = useToast();
  const { currentPartner } = usePartnerContext();
  const { domains, isLoading, addDomain, verifyDomain, setPrimary, deleteDomain } = 
    usePartnerDomains(currentPartner?.id || '');

  const [newDomain, setNewDomain] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

  const handleAddDomain = () => {
    if (!newDomain) return;

    addDomain.mutate(newDomain, {
      onSuccess: () => {
        setNewDomain('');
        setIsAddOpen(false);
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domínios</h1>
          <p className="text-muted-foreground">
            Configure domínios personalizados para sua plataforma white-label
          </p>
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
              <DialogTitle>Adicionar Domínio</DialogTitle>
              <DialogDescription>
                Adicione um domínio personalizado para sua plataforma
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="app.suaempresa.com.br"
              />
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Após adicionar, você precisará configurar os registros DNS para verificar o domínio.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddDomain} disabled={addDomain.isPending || !newDomain}>
                {addDomain.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Domains Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">Nenhum domínio configurado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione um domínio personalizado para sua plataforma
              </p>
              <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Domínio
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{domain.domain}</span>
                        {domain.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Principal
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {domain.is_verified ? (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {domain.ssl_status === 'active' ? (
                        <Badge variant="outline">
                          <Shield className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!domain.is_verified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDomain(domain)}
                          >
                            Verificar
                          </Button>
                        )}
                        {domain.is_verified && !domain.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrimary.mutate(domain.id)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteDomain.mutate(domain.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Verification Dialog */}
      <Dialog open={!!selectedDomain} onOpenChange={() => setSelectedDomain(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verificar Domínio</DialogTitle>
            <DialogDescription>
              Configure os registros DNS para verificar o domínio {selectedDomain?.domain}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                Adicione o seguinte registro TXT ao DNS do seu domínio:
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <Badge>TXT</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nome:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">_verification</code>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                      {selectedDomain?.verification_token}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyToClipboard(selectedDomain?.verification_token || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              Após configurar o DNS, pode levar até 24 horas para propagar. Clique em "Verificar Agora" para checar.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDomain(null)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                verifyDomain.mutate(selectedDomain.id);
                setSelectedDomain(null);
              }}
              disabled={verifyDomain.isPending}
            >
              {verifyDomain.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verificar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
