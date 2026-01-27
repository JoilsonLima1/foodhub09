import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useSystemSettings } from '@/hooks/useSystemSettings';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
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
}

const allNavItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/orders', label: 'Pedidos', icon: 'ClipboardList' },
  { path: '/pos', label: 'PDV/Caixa', icon: 'Calculator' },
  { path: '/tables', label: 'Mesas', icon: 'Grid3X3' },
  { path: '/kitchen', label: 'Cozinha', icon: 'ChefHat' },
  { path: '/deliveries', label: 'Entregas', icon: 'Truck' },
  { path: '/courier-dashboard', label: 'Minhas Entregas', icon: 'Truck' },
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
  const [isOpen, setIsOpen] = useState(false);

  // Use dynamic branding or fallback
  const logoUrl = branding?.logo_url || fallbackLogo;
  const companyName = branding?.company_name || 'FoodHub09';

  // Filter nav items based on roles - super_admin is always checked first
  const getNavItems = (): NavItem[] => {
    // Super admin has access to everything including super admin panel
    if (roles.includes('super_admin')) {
      return allNavItems.filter(item => item.path !== '/courier-dashboard');
    }
    
    // Admin has access to most things but NOT super admin panel
    if (roles.includes('admin')) {
      return allNavItems.filter(item => 
        item.path !== '/courier-dashboard' && item.path !== '/super-admin'
      );
    }
    if (roles.includes('manager')) {
      return allNavItems.filter(item => 
        !['pos', 'kitchen', 'courier-dashboard', 'super-admin'].includes(item.path.replace('/', ''))
      );
    }
    if (roles.includes('cashier')) {
      return allNavItems.filter(item => 
        ['/pos', '/orders'].includes(item.path)
      );
    }
    if (roles.includes('kitchen')) {
      return allNavItems.filter(item => item.path === '/kitchen');
    }
    if (roles.includes('stock')) {
      return allNavItems.filter(item => 
        ['/stock', '/products'].includes(item.path)
      );
    }
    if (roles.includes('delivery')) {
      return allNavItems.filter(item => item.path === '/courier-dashboard');
    }
    return [{ path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' }];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
          'fixed top-0 left-0 z-40 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <img src={logoUrl} alt={`${companyName} Logo`} className="h-10 w-10 rounded-lg object-contain" />
          <div className="flex-1">
            <h1 className="font-bold text-lg">{companyName}</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema de Gestão</p>
          </div>
        </div>

        {/* Trial Status Badge */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <TrialStatusBadge />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 mr-2" />
            ) : (
              <Moon className="h-4 w-4 mr-2" />
            )}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </Button>

          {/* User Info */}
          {profile && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-medium">
                  {profile.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {roles[0] || 'Usuário'}
                </p>
              </div>
            </div>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  );
}
