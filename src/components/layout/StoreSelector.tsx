import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { useTenantModules } from '@/hooks/useTenantModules';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StoreSelector() {
  const { activeStoreId, activeStore, stores, canSwitchStore, setActiveStoreId, isLoading } = useActiveStore();
  const { allModules, tenantModules } = useTenantModules();

  // Check if multi_store module is active
  const multiStoreModule = allModules?.find(m => m.slug === 'multi_store');
  const hasMultiStore = multiStoreModule && tenantModules?.some(
    tm => tm.addon_module_id === multiStoreModule.id && ['active', 'trial'].includes(tm.status)
  );
  
  if (!hasMultiStore || stores.length <= 1) {
    return null;
  }

  // For non-admin users, show locked badge
  if (!canSwitchStore && activeStore) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
        <Store className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{activeStore.name}</span>
        {activeStore.is_headquarters && (
          <Badge variant="secondary" className="text-[10px] px-1.5">Matriz</Badge>
        )}
      </div>
    );
  }

  return (
    <Select
      value={activeStoreId || ''}
      onValueChange={setActiveStoreId}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[200px] h-9">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Selecione a loja" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            <div className="flex items-center gap-2">
              <span>{store.name}</span>
              {store.is_headquarters && (
                <Badge variant="secondary" className="text-[10px] px-1.5 ml-1">
                  Matriz
                </Badge>
              )}
              {!store.is_active && (
                <Badge variant="destructive" className="text-[10px] px-1.5 ml-1">
                  Inativa
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
