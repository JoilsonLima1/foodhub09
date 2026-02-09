/**
 * ContextSwitcher - Dropdown to switch between partner/tenant/super_admin contexts.
 * Only renders if user has multiple available contexts.
 */

import { useNavigate } from 'react-router-dom';
import { useActiveContext, ActiveContextType } from '@/hooks/useActiveContext';
import { Building2, Crown, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const contextConfig: Record<ActiveContextType, { label: string; icon: typeof Building2; description: string }> = {
  super_admin: { label: 'Super Admin', icon: Crown, description: 'Administração global' },
  partner: { label: 'Parceiro', icon: Users, description: 'Painel do parceiro' },
  tenant: { label: 'Minha Empresa', icon: Building2, description: 'Gestão do negócio' },
};

export function ContextSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate();
  const { contextType, availableContexts, canSwitch, switchContext } = useActiveContext();

  if (!canSwitch) return null;

  const current = contextConfig[contextType];
  const CurrentIcon = current.icon;

  const handleSwitch = (type: ActiveContextType) => {
    switchContext(type);
    const routes: Record<ActiveContextType, string> = {
      super_admin: '/super-admin',
      partner: '/partner',
      tenant: '/dashboard',
    };
    navigate(routes[type]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-dashed",
            collapsed ? "w-10 px-0 justify-center" : "w-full justify-start"
          )}
          title={collapsed ? current.label : undefined}
        >
          <CurrentIcon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="truncate text-xs">{current.label}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {availableContexts.map((type) => {
          const config = contextConfig[type];
          const Icon = config.icon;
          const isActive = type === contextType;
          return (
            <DropdownMenuItem
              key={type}
              onClick={() => handleSwitch(type)}
              className={cn(isActive && 'bg-accent')}
            >
              <Icon className="h-4 w-4 mr-2" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">{config.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
