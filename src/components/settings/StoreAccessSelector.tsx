import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Store, 
  CheckCircle2, 
  XCircle,
  MapPin
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  code: string;
  is_headquarters: boolean;
  is_active: boolean;
}

interface StoreAccessSelectorProps {
  selectedStoreIds: string[];
  onStoreIdsChange: (storeIds: string[]) => void;
  isAdmin?: boolean;
  allStoresAccess?: boolean;
  onAllStoresAccessChange?: (value: boolean) => void;
  disabled?: boolean;
}

export function StoreAccessSelector({
  selectedStoreIds,
  onStoreIdsChange,
  isAdmin = false,
  allStoresAccess = false,
  onAllStoresAccessChange,
  disabled = false,
}: StoreAccessSelectorProps) {
  const { tenantId, hasRole } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasMultiStore = hasRole('admin') || hasRole('super_admin');

  useEffect(() => {
    async function fetchStores() {
      if (!tenantId) {
        setStores([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, code, is_headquarters, is_active')
          .eq('tenant_id', tenantId)
          .order('is_headquarters', { ascending: false })
          .order('name', { ascending: true });

        if (error) {
          console.error('[StoreAccessSelector] Error fetching stores:', error);
          setStores([]);
        } else {
          setStores(data || []);
        }
      } catch (err) {
        console.error('[StoreAccessSelector] Exception:', err);
        setStores([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStores();
  }, [tenantId]);

  const headquarters = useMemo(() => stores.find(s => s.is_headquarters), [stores]);
  const branches = useMemo(() => stores.filter(s => !s.is_headquarters), [stores]);

  const toggleStore = (storeId: string) => {
    if (disabled || (isAdmin && allStoresAccess)) return;

    if (selectedStoreIds.includes(storeId)) {
      onStoreIdsChange(selectedStoreIds.filter(id => id !== storeId));
    } else {
      onStoreIdsChange([...selectedStoreIds, storeId]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onStoreIdsChange(stores.map(s => s.id));
  };

  const selectMatrixOnly = () => {
    if (disabled) return;
    const hq = stores.find(s => s.is_headquarters);
    onStoreIdsChange(hq ? [hq.id] : []);
  };

  const selectBranchesOnly = () => {
    if (disabled) return;
    onStoreIdsChange(stores.filter(s => !s.is_headquarters).map(s => s.id));
  };

  const clearSelection = () => {
    if (disabled) return;
    onStoreIdsChange([]);
  };

  const handleAllStoresToggle = (checked: boolean) => {
    if (onAllStoresAccessChange) {
      onAllStoresAccessChange(checked);
      if (checked) {
        // Auto-select all stores when toggle is enabled
        onStoreIdsChange(stores.map(s => s.id));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
        Nenhuma loja encontrada para este tenant.
      </div>
    );
  }

  // Single store - simplified UI
  if (stores.length === 1) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Acesso à Loja</Label>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stores[0].name}</span>
            {stores[0].is_headquarters && (
              <Badge variant="secondary" className="text-[10px]">Matriz</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Usuário terá acesso automático à única loja disponível.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Acesso às Lojas</Label>
        {selectedStoreIds.length > 0 && !allStoresAccess && (
          <Badge variant="outline" className="text-xs">
            {selectedStoreIds.length} de {stores.length} selecionada(s)
          </Badge>
        )}
      </div>

      {/* Admin all-stores toggle */}
      {isAdmin && onAllStoresAccessChange && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <div>
              <span className="text-sm font-medium">Acesso a todas as lojas</span>
              <p className="text-xs text-muted-foreground">
                Administradores podem acessar matriz e todas as filiais
              </p>
            </div>
          </div>
          <Switch
            checked={allStoresAccess}
            onCheckedChange={handleAllStoresToggle}
            disabled={disabled}
          />
        </div>
      )}

      {/* Quick action buttons */}
      {!allStoresAccess && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={disabled}
            className="text-xs"
          >
            Selecionar todas
          </Button>
          {headquarters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectMatrixOnly}
              disabled={disabled}
              className="text-xs"
            >
              Somente Matriz
            </Button>
          )}
          {branches.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectBranchesOnly}
              disabled={disabled}
              className="text-xs"
            >
              Somente Filiais
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={disabled}
            className="text-xs text-muted-foreground"
          >
            Limpar
          </Button>
        </div>
      )}

      {/* Store list */}
      <div className={`space-y-2 ${allStoresAccess ? 'opacity-50 pointer-events-none' : ''}`}>
        {stores.map(store => {
          const isSelected = selectedStoreIds.includes(store.id);
          return (
            <div
              key={store.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary ring-1 ring-primary/30'
                  : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
              } ${disabled || allStoresAccess ? 'cursor-not-allowed' : ''}`}
              onClick={() => toggleStore(store.id)}
            >
              <Checkbox
                checked={isSelected || allStoresAccess}
                onCheckedChange={() => toggleStore(store.id)}
                disabled={disabled || allStoresAccess}
                className={isSelected ? 'border-primary data-[state=checked]:bg-primary' : ''}
              />
              
              {store.is_headquarters ? (
                <Building2 className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              ) : (
                <Store className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                    {store.name}
                  </span>
                  {store.is_headquarters && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">Matriz</Badge>
                  )}
                  {!store.is_active && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">Inativa</Badge>
                  )}
                </div>
                {store.code && (
                  <p className="text-xs text-muted-foreground">Código: {store.code}</p>
                )}
              </div>

              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/30" />
              )}
            </div>
          );
        })}
      </div>

      {/* Validation message */}
      {!isAdmin && selectedStoreIds.length === 0 && !allStoresAccess && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Selecione pelo menos uma loja para este usuário
        </p>
      )}
    </div>
  );
}
