/**
 * PartnerSidebar - Navigation sidebar for partner panel
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Plus,
  Palette,
  Globe,
  CreditCard,
  Users,
  LogOut,
  Package,
  ChevronLeft,
  Receipt,
  Rocket,
  TrendingUp,
  Landmark,
  Ticket,
  Puzzle,
  Bell,
  ClipboardCheck,
  FileText,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContextSwitcher } from '@/components/layout/ContextSwitcher';

const menuItems = [
  { 
    path: '/partner/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
  },
  { 
    path: '/partner/onboarding', 
    label: 'Onboarding', 
    icon: ClipboardCheck,
    adminOnly: true,
  },
  { 
    path: '/partner/tenants', 
    label: 'Organizações', 
    icon: Building2 
  },
  { 
    path: '/partner/tenants/create', 
    label: 'Nova Organização', 
    icon: Plus 
  },
  { 
    path: '/partner/leads', 
    label: 'Leads', 
    icon: Users,
    adminOnly: true,
  },
  { 
    path: '/partner/plans', 
    label: 'Planos', 
    icon: Package,
    adminOnly: true,
  },
  {
    path: '/partner/addons',
    label: 'Add-ons',
    icon: Puzzle,
    adminOnly: true,
  },
  {
    path: '/partner/coupons',
    label: 'Cupons',
    icon: Ticket,
    adminOnly: true,
  },
  {
    path: '/partner/invoices',
    label: 'Faturas',
    icon: Receipt,
    adminOnly: true,
  },
  { 
    path: '/partner/branding', 
    label: 'Branding', 
    icon: Palette,
    adminOnly: true,
  },
  { 
    path: '/partner/domains', 
    label: 'Domínios', 
    icon: Globe,
    adminOnly: true,
  },
  { 
    path: '/partner/publication', 
    label: 'Publicação', 
    icon: Rocket,
    adminOnly: true,
  },
  {
    path: '/partner/sales-page',
    label: 'Página de Vendas',
    icon: FileText,
    adminOnly: true,
  },
  { 
    path: '/partner/fees', 
    label: 'Taxas', 
    icon: CreditCard,
    adminOnly: true,
  },
  { 
    path: '/partner/earnings', 
    label: 'Ganhos', 
    icon: TrendingUp,
    adminOnly: true,
  },
  { 
    path: '/partner/settlements', 
    label: 'Liquidação', 
    icon: Landmark,
    adminOnly: true,
  },
  { 
    path: '/partner/payments', 
    label: 'Pagamentos', 
    icon: CreditCard,
    adminOnly: true,
  },
  { 
    path: '/partner/notifications', 
    label: 'Notificações', 
    icon: Bell,
    adminOnly: true,
  },
  { 
    path: '/partner/users', 
    label: 'Usuários', 
    icon: Users,
    adminOnly: true,
  },
  { 
    path: '/partner/billing', 
    label: 'Faturamento', 
    icon: Receipt,
  },
  { 
    path: '/partner/api-keys', 
    label: 'Chaves API', 
    icon: Key,
    adminOnly: true,
  },
];

export function PartnerSidebar() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { currentPartner, partnerBranding, isPartnerAdmin } = usePartnerContext();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const visibleItems = menuItems.filter(item => 
    !item.adminOnly || isPartnerAdmin
  );

  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {partnerBranding?.logo_url ? (
            <img 
              src={partnerBranding.logo_url} 
              alt={currentPartner?.name || 'Logo'} 
              className="h-8 w-8 object-contain"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {partnerBranding?.platform_name || currentPartner?.name || 'Painel do Parceiro'}
            </h2>
            <p className="text-xs text-muted-foreground">Área do Parceiro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* User Profile & Logout */}
      <div className="p-3 space-y-2">
        {/* Context Switcher */}
        <ContextSwitcher />

        {/* Back to main app (if user has tenant access) - only show if no context switcher */}

        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.full_name || 'Parceiro'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPartnerAdmin ? 'Administrador' : 'Suporte'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
