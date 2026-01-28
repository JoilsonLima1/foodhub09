import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useBusinessCategoryContext } from '@/contexts/BusinessCategoryContext';
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
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useMemo } from 'react';
import fallbackLogo from '@/assets/logo.png';
import { TrialStatusBadge } from '@/components/trial/TrialStatusBadge';

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
};

interface NavItem {
  path: string;
  label: string;
  icon: string;
  feature?: string;
}

const allNavItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/orders', label: 'Pedidos', icon: 'ClipboardList' },
  { path: '/pos', label: 'PDV/Caixa', icon: 'Calculator', feature: 'pos' },
  { path: '/tables', label: 'Mesas', icon: 'Grid3X3', feature: 'tables' },
  { path: '/kitchen', label: 'Cozinha', icon: 'ChefHat', feature: 'kitchen_display' },
  { path: '/deliveries', label: 'Entregas', icon: 'Truck', feature: 'delivery' },
  { path: '/courier-dashboard', label: 'Minhas Entregas', icon: 'Truck', feature: 'delivery' },
  { path: '/products', label: 'Produtos', icon: 'Package' },
  { path: '/stock', label: 'Estoque', icon: 'Warehouse' },
  { path: '/reports', label: 'Relatórios', icon: 'BarChart3' },
  { path: '/settings', label: 'Configurações', icon: 'Settings' },
  { path: '/super-admin', label: 'Super Admin', icon: 'Crown' },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, roles, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { branding } = useSystemSettings();
  const { t, hasFeature } = useBusinessCategoryContext();
  const [isOpen, setIsOpen] = useState(false);

  const logoUrl = branding?.logo_url || fallbackLogo;
  const companyName = branding?.company_name || 'FoodHub09';

  const getLocalizedLabel = (path: string, defaultLabel: string): string => {
    const labelMap: Record<string, string> = {
      '/orders': t('order') + 's',
      '/products': t('products'),
      '/kitchen': t('kitchen'),
      '/tables': t('table') + 's',
    };
    return labelMap[path] || defaultLabel;
  };

  const getNavItems = useMemo((): NavItem[] => {
    const featureFiltered = allNavItems.filter(item => {
      if (!item.feature) return true;
      return hasFeature(item.feature as any);
    });

    if (roles.includes('super_admin')) {
      return featureFiltered.filter(item => item.path !== '/courier-dashboard');
    }
    
    if (roles.includes('admin')) {
      return featureFiltered.filter(item => 
        item.path !== '/courier-dashboard' && item.path !== '/super-admin'
      );
    }
    if (roles.includes('manager')) {
      return featureFiltered.filter(item => 
        !['pos', 'kitchen', 'courier-dashboard', 'super-admin'].includes(item.path.replace('/', ''))
      );
    }
    if (roles.includes('cashier')) {
      return featureFiltered.filter(item => 
        ['/pos', '/orders'].includes(item.path)
      );
    }
    if (roles.includes('kitchen')) {
      return featureFiltered.filter(item => item.path === '/kitchen');
    }
    if (roles.includes('stock')) {
      return featureFiltered.filter(item => 
        ['/stock', '/products'].includes(item.path)
      );
    }
    if (roles.includes('delivery')) {
      return featureFiltered.filter(item => item.path === '/courier-dashboard');
    }
    return [{ path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' }];
  }, [roles, hasFeature]);

  const navItems = getNavItems;

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
          'fixed top-0 left-0 z-40 h-full w-56 bg-sidebar text-sidebar-foreground transition-transform duration-300',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo - Compact */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border">
          <img src={logoUrl} alt={`${companyName} Logo`} className="h-8 w-8 rounded-md object-contain" />
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">{companyName}</h1>
          </div>
        </div>

        {/* Trial Status Badge - Compact */}
        <div className="px-3 py-2 border-b border-sidebar-border">
          <TrialStatusBadge />
        </div>

        {/* Navigation - Compact */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = location.pathname === item.path;
              const label = getLocalizedLabel(item.path, item.label);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Dropdown - Footer */}
        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors',
                  'hover:bg-sidebar-accent text-left'
                )}
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-primary">
                    {getUserInitials()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-sidebar-foreground">
                    {profile?.full_name || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">
                    {getRoleLabel()}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
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
