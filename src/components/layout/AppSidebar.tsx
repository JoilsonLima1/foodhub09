import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useAppearance } from '@/hooks/useAppearance';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useBusinessCategoryContext } from '@/contexts/BusinessCategoryContext';
import { useSidebarModules } from '@/hooks/useSidebarModules';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { MODULE_CATEGORY_LABELS } from '@/lib/moduleRoutes';
import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  ChefHat,
  Truck,
  Package,
  Warehouse,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Crown,
  Grid3X3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Puzzle,
  LucideIcon,
  Receipt,
  CalendarDays,
  TrendingUp,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState, useMemo } from 'react';
import fallbackLogo from '@/assets/logo.png';
import { TrialStatusBadge } from '@/components/trial/TrialStatusBadge';
import { StoreSelector } from './StoreSelector';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  ChefHat,
  Truck,
  Package,
  Warehouse,
  BarChart3,
  Settings,
  Crown,
  Grid3X3,
  Building2,
  Puzzle,
};

interface NavItem {
  path: string;
  label: string;
  icon: string | LucideIcon;
  feature?: string;
  badge?: string;
  /** If true, shows lock icon and links to upsell page */
  isLocked?: boolean;
}

// Core navigation items (always available based on plan features)
// Items with moduleSlug are controlled by addon modules
const coreNavItems: (NavItem & { moduleSlug?: string })[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/orders', label: 'Pedidos', icon: 'ClipboardList' },
  { path: '/pos', label: 'PDV/Caixa', icon: 'Calculator', feature: 'pos' },
  { path: '/tables', label: 'Mesas', icon: 'Grid3X3', feature: 'tables' },
  { path: '/comandas', label: 'Comandas', icon: Receipt, feature: 'tables', moduleSlug: 'comandas' },
  { path: '/events', label: 'Eventos', icon: CalendarDays, moduleSlug: 'events_tickets' },
  { path: '/marketing', label: 'Marketing', icon: TrendingUp, moduleSlug: 'marketing_ceo' },
  { path: '/kitchen', label: 'Cozinha', icon: 'ChefHat', feature: 'kitchen_display', moduleSlug: 'kitchen_monitor' },
  { path: '/deliveries', label: 'Entregas', icon: 'Truck', feature: 'delivery', moduleSlug: 'smart_delivery' },
  { path: '/courier-dashboard', label: 'Minhas Entregas', icon: 'Truck', feature: 'delivery' },
  { path: '/products', label: 'Produtos', icon: 'Package' },
  { path: '/stock', label: 'Estoque', icon: 'Warehouse' },
  { path: '/reports', label: 'Relatórios', icon: 'BarChart3' },
];

// Admin-only items
const adminNavItems: NavItem[] = [
  { path: '/settings', label: 'Configurações', icon: 'Settings' },
  { path: '/super-admin', label: 'Super Admin', icon: 'Crown' },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, roles, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { sidebarCollapsed, toggleSidebar } = useAppearance();
  const { branding } = useSystemSettings();
  const { t, hasFeature } = useBusinessCategoryContext();
  const { sidebarModules, hasMultiStore, hasModuleActive, isLoading: modulesLoading } = useSidebarModules();
  const { activeStoreName } = useActiveStore();
  const [isOpen, setIsOpen] = useState(false);

  const logoUrl = branding?.logo_url || fallbackLogo;
  const companyName = branding?.company_name || 'FoodHub09';

  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  const isSuperAdmin = roles.includes('super_admin');
  const isManager = roles.includes('manager');

  const getLocalizedLabel = (path: string, defaultLabel: string): string => {
    const labelMap: Record<string, string> = {
      '/orders': t('order') + 's',
      '/products': t('products'),
      '/kitchen': t('kitchen'),
      '/tables': t('table') + 's',
    };
    return labelMap[path] || defaultLabel;
  };

  // Filter core nav items based on role, features, and module activation
  const filteredCoreItems = useMemo((): NavItem[] => {
    // First pass: filter by plan features (hard filter)
    let items = coreNavItems.filter(item => {
      // Check plan features - these are hard requirements
      if (item.feature && !hasFeature(item.feature as any)) {
        return false;
      }
      return true;
    });

    // Role-based filtering (hard filter)
    if (roles.includes('cashier')) {
      return items.filter(item => ['/pos', '/orders'].includes(item.path));
    }
    if (roles.includes('kitchen')) {
      return items.filter(item => item.path === '/kitchen');
    }
    if (roles.includes('stock')) {
      return items.filter(item => ['/stock', '/products'].includes(item.path));
    }
    if (roles.includes('delivery')) {
      return items.filter(item => item.path === '/courier-dashboard');
    }
    
    // Remove courier-dashboard for non-delivery roles
    items = items.filter(item => 
      item.path !== '/courier-dashboard' || roles.includes('delivery')
    );

    // Second pass: mark module items as locked if not active (soft filter - show with upsell)
    // Only for admin/manager roles who can purchase modules
    const processedItems = items.map(item => {
      if (item.moduleSlug && !hasModuleActive(item.moduleSlug)) {
        // Show item but mark as locked for upsell
        return {
          ...item,
          isLocked: true,
        };
      }
      return item;
    });

    return processedItems;
  }, [roles, hasFeature, hasModuleActive]);

  // Get module nav items (grouped by category)
  const moduleNavItems = useMemo(() => {
    if (!isAdmin && !isManager) return [];
    
    // Filter modules based on role
    const visibleModules = sidebarModules.filter(mod => {
      // Managers can only see operational modules
      if (isManager && !isAdmin) {
        return mod.category === 'operations';
      }
      return true;
    });

    return visibleModules.map(mod => ({
      path: mod.route,
      label: mod.label,
      icon: mod.icon,
      badge: mod.badge,
    }));
  }, [sidebarModules, isAdmin, isManager]);

  // Get admin items
  const visibleAdminItems = useMemo(() => {
    if (!isAdmin) return [];
    return adminNavItems.filter(item => {
      if (item.path === '/super-admin') return isSuperAdmin;
      return true;
    });
  }, [isAdmin, isSuperAdmin]);

  const getUserInitials = () => {
    if (!profile?.full_name) return 'U';
    const names = profile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return names[0].charAt(0).toUpperCase();
  };

  const getRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      manager: 'Gerente',
      cashier: 'Caixa',
      kitchen: 'Cozinha',
      stock: 'Estoque',
      delivery: 'Entregador',
    };
    return roleLabels[roles[0]] || 'Usuário';
  };

  const renderNavItem = (item: NavItem, key: string) => {
    const isLucideIcon = typeof item.icon !== 'string';
    const Icon = isLucideIcon ? item.icon : iconMap[item.icon as string];
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '?');
    const label = typeof item.icon === 'string' ? getLocalizedLabel(item.path, item.label) : item.label;
    const isLocked = item.isLocked === true;

    return (
      <li key={key}>
        <Link
          to={item.path}
          onClick={() => setIsOpen(false)}
          title={sidebarCollapsed ? (isLocked ? `${label} (Adquirir)` : label) : undefined}
          className={cn(
            'flex items-center rounded-md text-xs font-medium transition-colors',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2',
            isLocked
              ? 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground/70'
              : isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          {Icon && <Icon className={cn("h-4 w-4 shrink-0", isLocked && "opacity-50")} />}
          {!sidebarCollapsed && (
            <>
              <span className={cn("truncate flex-1", isLocked && "opacity-70")}>{label}</span>
              {isLocked ? (
                <Lock className="h-3 w-3 text-muted-foreground" />
              ) : item.badge ? (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              ) : null}
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full bg-sidebar text-sidebar-foreground transition-all duration-300',
          'flex flex-col',
          sidebarCollapsed ? 'w-16' : 'w-56',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo - Compact */}
        <div className={cn(
          "flex items-center border-b border-sidebar-border",
          sidebarCollapsed ? "justify-center px-2 py-3" : "gap-2.5 px-4 py-3"
        )}>
          <img src={logoUrl} alt={`${companyName} Logo`} className="h-8 w-8 rounded-md object-contain shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">{companyName}</h1>
            </div>
          )}
        </div>

        {/* Trial Status Badge + Store Selector - Compact */}
        {!sidebarCollapsed && (
          <div className="px-3 py-2 border-b border-sidebar-border space-y-2">
            <TrialStatusBadge />
            <StoreSelector />
            {/* Show current store name for managers */}
            {isManager && !isAdmin && activeStoreName && (
              <div className="text-[10px] text-muted-foreground px-1 truncate">
                📍 {activeStoreName}
              </div>
            )}
          </div>
        )}

        {/* Navigation - Compact */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {/* Core Items */}
          <ul className="space-y-0.5">
            {filteredCoreItems.map((item) => renderNavItem(item, item.path))}
          </ul>

          {/* Modules Section */}
          {moduleNavItems.length > 0 && (
            <>
              {!sidebarCollapsed && (
                <div className="mt-4 mb-2">
                  <div className="flex items-center gap-1.5 px-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <Puzzle className="h-3 w-3" />
                    <span>Módulos</span>
                  </div>
                </div>
              )}
              {sidebarCollapsed && <Separator className="my-2" />}
              <ul className="space-y-0.5">
                {moduleNavItems.map((item, index) => renderNavItem(item, `module-${index}`))}
              </ul>
            </>
          )}

          {/* Multi Lojas - Only if module is active */}
          {hasMultiStore && isAdmin && (
            <>
              {!sidebarCollapsed && (
                <div className="mt-4 mb-2">
                  <div className="flex items-center gap-1.5 px-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <Building2 className="h-3 w-3" />
                    <span>Gestão</span>
                  </div>
                </div>
              )}
              {sidebarCollapsed && <Separator className="my-2" />}
              <ul className="space-y-0.5">
                {renderNavItem({
                  path: '/stores',
                  label: 'Multi Lojas',
                  icon: Building2,
                }, 'stores')}
              </ul>
            </>
          )}

          {/* Admin Items */}
          {visibleAdminItems.length > 0 && (
            <>
              {!sidebarCollapsed && (
                <div className="mt-4 mb-2">
                  <div className="flex items-center gap-1.5 px-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <Settings className="h-3 w-3" />
                    <span>Admin</span>
                  </div>
                </div>
              )}
              {sidebarCollapsed && <Separator className="my-2" />}
              <ul className="space-y-0.5">
                {visibleAdminItems.map((item) => renderNavItem(item, item.path))}
              </ul>
            </>
          )}
        </nav>

        {/* Collapse Toggle Button - Desktop Only */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent transition-colors"
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* User Profile Dropdown - Footer */}
        <div className="border-t border-sidebar-border px-2 py-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-full flex items-center rounded-md transition-colors',
                  'hover:bg-sidebar-accent text-left',
                  sidebarCollapsed ? 'justify-center p-1.5' : 'gap-2 px-2 py-1'
                )}
                title={sidebarCollapsed ? profile?.full_name || 'Usuário' : undefined}
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-semibold text-primary">
                    {getUserInitials()}
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate text-sidebar-foreground leading-tight">
                        {profile?.full_name || 'Usuário'}
                      </p>
                      <p className="text-[9px] text-sidebar-foreground/50 truncate leading-tight">
                        {getRoleLabel()}
                      </p>
                    </div>
                    <ChevronDown className="h-3 w-3 text-sidebar-foreground/50 shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Modo Escuro
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut} 
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
