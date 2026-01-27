import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Grid3X3, 
  Users, 
  QrCode, 
  Receipt, 
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTables, useTableSessionMutations, type Table } from '@/hooks/useTables';
import { TableSessionPanel } from '@/components/tables/TableSessionPanel';
import { QRCodeDialog } from '@/components/tables/QRCodeDialog';
import { useAuth } from '@/contexts/AuthContext';

export default function Tables() {
  const { tenantId } = useAuth();
  const { tables, isLoading, createTable, deleteTable } = useTables();
  const { openSession } = useTableSessionMutations();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableName, setNewTableName] = useState('');
  
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(false);
  
  const [qrCodeTable, setQrCodeTable] = useState<Table | null>(null);
  const [deleteConfirmTable, setDeleteConfirmTable] = useState<Table | null>(null);

  const handleCreateTable = async () => {
    const number = parseInt(newTableNumber);
    if (isNaN(number) || number <= 0) return;
    
    await createTable.mutateAsync({
      number,
      name: newTableName.trim() || undefined,
    });
    
    setIsCreateOpen(false);
    setNewTableNumber('');
    setNewTableName('');
  };

  const handleOpenSession = async (table: Table) => {
    if (table.activeSession) {
      // Open existing session
      setSelectedTable(table);
      setIsSessionPanelOpen(true);
    } else {
      // Create new session
      await openSession.mutateAsync({ tableId: table.id });
      setSelectedTable(table);
      setIsSessionPanelOpen(true);
    }
  };

  const handleDeleteTable = async () => {
    if (!deleteConfirmTable) return;
    await deleteTable.mutateAsync(deleteConfirmTable.id);
    setDeleteConfirmTable(null);
  };

  const getMenuUrl = (table: Table) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/menu/${tenantId}?mesa=${table.number}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Mesas & Comandas</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Mesa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{tables.length}</div>
            <p className="text-sm text-muted-foreground">Total de Mesas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {tables.filter(t => t.activeSession).length}
            </div>
            <p className="text-sm text-muted-foreground">Mesas Ocupadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {tables.filter(t => !t.activeSession).length}
            </div>
            <p className="text-sm text-muted-foreground">Mesas Livres</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">
              {tables.reduce((sum, t) => sum + (t.activeSession?.total || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-sm text-muted-foreground">Consumo Ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3X3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma mesa cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Crie mesas para começar a usar o sistema de comandas
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Mesa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => (
            <Card
              key={table.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                table.activeSession 
                  ? 'border-green-500 bg-green-500/5' 
                  : 'hover:border-primary'
              }`}
              onClick={() => handleOpenSession(table)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl font-bold">{table.number}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setQrCodeTable(table);
                      }}>
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.open(getMenuUrl(table), '_blank');
                      }}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Cardápio
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmTable(table);
                        }}
                        className="text-destructive"
                        disabled={!!table.activeSession}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {table.name && (
                  <p className="text-sm text-muted-foreground mb-2 truncate">
                    {table.name}
                  </p>
                )}
                
                {table.activeSession ? (
                  <div className="space-y-1">
                    <Badge variant="default" className="bg-green-600">
                      <Users className="h-3 w-3 mr-1" />
                      Ocupada
                    </Badge>
                    <p className="text-sm font-medium">
                      {table.activeSession.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Livre
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Table Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tableNumber">Número da Mesa *</Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                placeholder="Ex: 1, 2, 3..."
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tableName">Nome/Descrição (opcional)</Label>
              <Input
                id="tableName"
                placeholder="Ex: Varanda, VIP, etc."
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTable}
              disabled={!newTableNumber || createTable.isPending}
            >
              {createTable.isPending ? 'Criando...' : 'Criar Mesa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Panel */}
      {selectedTable && (
        <TableSessionPanel
          table={selectedTable}
          open={isSessionPanelOpen}
          onOpenChange={setIsSessionPanelOpen}
        />
      )}

      {/* QR Code Dialog */}
      {qrCodeTable && (
        <QRCodeDialog
          table={qrCodeTable}
          menuUrl={getMenuUrl(qrCodeTable)}
          open={!!qrCodeTable}
          onOpenChange={(open) => !open && setQrCodeTable(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmTable} onOpenChange={(open) => !open && setDeleteConfirmTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mesa {deleteConfirmTable?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mesa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
