/**
 * SuperAdminMarketingPanel
 * 
 * Wrapper for MarketingCEOPanel in Super Admin context.
 * Provides organization selection and bypasses module limits.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Info, TrendingUp } from 'lucide-react';
import { useOrganizations, Organization } from '@/hooks/useOrganizations';
import { MarketingCEOPanel } from '@/components/marketing/MarketingCEOPanel';

export function SuperAdminMarketingPanel() {
  const { organizations, isLoading } = useOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            CEO de Marketing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Org Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                CEO de Marketing (Administração Global)
              </CardTitle>
              <CardDescription>
                Gerencie o SEO e marketing de qualquer organização
              </CardDescription>
            </div>
            {selectedOrg && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {selectedOrg.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Select
                value={selectedOrgId || ''}
                onValueChange={(value) => setSelectedOrgId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma organização..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{org.name}</span>
                        {!org.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {organizations.length === 0 && (
              <span className="text-sm text-muted-foreground">
                Nenhuma organização encontrada
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No organization selected state */}
      {!selectedOrgId && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Selecione uma organização</AlertTitle>
          <AlertDescription>
            Para gerenciar o Marketing, selecione uma organização acima. 
            Você terá acesso completo sem restrições de limites de uso.
          </AlertDescription>
        </Alert>
      )}

      {/* Marketing Panel with selected tenant */}
      {selectedOrgId && (
        <MarketingCEOPanel 
          tenantId={selectedOrgId} 
          isSuperAdmin={true}
        />
      )}
    </div>
  );
}
