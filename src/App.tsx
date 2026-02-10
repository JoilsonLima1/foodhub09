import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessCategoryProvider } from "@/contexts/BusinessCategoryContext";
import { ActiveStoreProvider } from "@/contexts/ActiveStoreContext";
import { PartnerProvider } from "@/contexts/PartnerContext";
import { PublicPartnerProvider } from "@/contexts/PublicPartnerContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ModuleRouteGuard } from "@/components/auth/ModuleRouteGuard";
import { TenantRouteGuard } from "@/components/auth/TenantRouteGuard";
import { PartnerRouteGuard } from "@/components/auth/PartnerRouteGuard";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";
import { PlatformSEOHead } from "@/components/seo/PlatformSEOHead";
import { PWASetup } from "@/components/pwa/PWASetup";

import Auth from "./pages/Auth";
import LandingResolver from "./pages/LandingResolver";
import Landing from "./pages/Landing";
import PartnerLanding from "./pages/PartnerLanding";
import PartnerSignup from "./pages/PartnerSignup";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import POS from "./pages/POS";
import Kitchen from "./pages/Kitchen";
import Deliveries from "./pages/Deliveries";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import CourierDashboard from "./pages/CourierDashboard";
import SuperAdmin from "./pages/SuperAdmin";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import NotFound from "./pages/NotFound";
import Tables from "./pages/Tables";
import PublicMenu from "./pages/PublicMenu";
import TrackOrder from "./pages/TrackOrder";
import Stores from "./pages/Stores";
import Comandas from "./pages/Comandas";
import Events from "./pages/Events";
import Marketing from "./pages/Marketing";
import PublicClientes from "./pages/PublicClientes";
import PublicRecursos from "./pages/PublicRecursos";
import PublicPlanos from "./pages/PublicPlanos";
import TenantBilling from "./pages/TenantBilling";
import TenantBillingAddons from "./pages/TenantBillingAddons";
import TenantBillingCoupon from "./pages/TenantBillingCoupon";
import StoneTenantPage from "./pages/StoneTenantPage";

// Partner pages
import PartnerDashboardAdmin from "./pages/partner/PartnerDashboardAdmin";
import PartnerLogin from "./pages/partner/PartnerLogin";
import PartnerAuthCallback from "./pages/partner/PartnerAuthCallback";
import {
  PartnerTenants,
  CreatePartnerTenant,
  PartnerBrandingPage,
  PartnerDomainsPage,
  PartnerPlansPage,
  PartnerFeesPage,
  PartnerUsersPage,
  PartnerInvoicesPage,
  PartnerPublicationPage,
  PartnerEarningsPage,
  PartnerSettlementsPage,
  PartnerPaymentsPage,
  PartnerTenantBillingPage,
  PartnerAddonsPage,
  PartnerCouponsPage,
  PartnerNotificationsPage,
  PartnerOnboardingPage,
  PartnerLeadsPage,
  PartnerSalesPage,
  PartnerApiKeysPage,
  PartnerBillingPage,
} from "./pages/partner";
// Public partner pages
import PublicParceiros from "./pages/PublicParceiros";
import PublicParceiroCadastro from "./pages/PublicParceiroCadastro";
import PublicParceiroProfile from "./pages/PublicParceiroProfile";
import PartnerSlugSignup from "./pages/PartnerSlugSignup";
import PartnerAuth from "./pages/PartnerAuth";
import PartnerIndexRedirect from "./components/partner/PartnerIndexRedirect";

const queryClient = new QueryClient();

// Component that applies the dynamic favicon
function DynamicFaviconHandler() {
  useDynamicFavicon();
  return null;
}

/** Preserves query params (e.g. context=partner) when redirecting /login → /auth */
function LoginRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('intent', 'login');
  return <Navigate to={`/auth?${params.toString()}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DynamicFaviconHandler />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PublicPartnerProvider>
          <AuthProvider>
            <PartnerProvider>
              <BusinessCategoryProvider>
                <ActiveStoreProvider>
                  <PlatformSEOHead />
                  <PWASetup />
                  <Routes>
                    {/* Root route - resolves landing by domain */}
                    <Route path="/" element={<LandingResolver />} />
                    
                    {/* Public platform routes */}
                    <Route path="/recursos" element={<PublicRecursos />} />
                    <Route path="/planos" element={<PublicPlanos />} />
                    <Route path="/clientes" element={<PublicClientes />} />
                    <Route path="/parceiros" element={<PublicParceiros />} />
                    <Route path="/parceiros/cadastrar" element={<PublicParceiroCadastro />} />
                    <Route path="/parceiros/:slug" element={<PublicParceiroProfile />} />
                    <Route path="/parceiros/:slug/começar" element={<PartnerSlugSignup />} />
                    <Route path="/auth" element={<Auth />} />
                    
                    {/* Partner public routes */}
                    <Route path="/p/:partnerSlug" element={<PartnerLanding />} />
                    <Route path="/signup" element={<PartnerSignup />} />
                    <Route path="/login" element={<LoginRedirect />} />
                    
                    {/* Friendly redirect routes for SEO */}
                    <Route path="/cadastro" element={<Navigate to="/auth?plan=free&intent=signup" replace />} />
                    <Route path="/entrar" element={<Navigate to="/auth?intent=login" replace />} />
                    <Route path="/sistema-gratis-para-restaurante" element={<Landing />} />
                    <Route path="/checkout/success" element={<CheckoutSuccess />} />
                    
                    {/* Public Menu - accessible without auth */}
                    <Route path="/menu/:tenantId" element={<PublicMenu />} />
                    
                    {/* Order Tracking - accessible without auth */}
                    <Route path="/rastrear" element={<TrackOrder />} />
                    <Route path="/rastrear/:tenantId" element={<TrackOrder />} />
                    
                    {/* Partner Auth - dedicated flow (BEFORE PartnerRouteGuard) */}
                    <Route path="/partner/auth" element={<PartnerLogin />} />
                    <Route path="/partner/auth/callback" element={<ProtectedRoute><PartnerAuthCallback /></ProtectedRoute>} />

                    {/* Partner Panel Routes */}
                    <Route path="/partner" element={<PartnerRouteGuard><PartnerLayout /></PartnerRouteGuard>}>
                      <Route index element={<PartnerIndexRedirect />} />
                      <Route path="dashboard" element={<PartnerDashboardAdmin />} />
                      <Route path="onboarding" element={<PartnerOnboardingPage />} />
                      <Route path="tenants" element={<PartnerTenants />} />
                      <Route path="tenants/create" element={<CreatePartnerTenant />} />
                      <Route path="branding" element={<PartnerBrandingPage />} />
                      <Route path="domains" element={<PartnerDomainsPage />} />
                      <Route path="publication" element={<PartnerPublicationPage />} />
                      <Route path="sales-page" element={<PartnerSalesPage />} />
                      <Route path="plans" element={<PartnerPlansPage />} />
                      <Route path="invoices" element={<PartnerInvoicesPage />} />
                      <Route path="fees" element={<PartnerFeesPage />} />
                      <Route path="earnings" element={<PartnerEarningsPage />} />
                      <Route path="settlements" element={<PartnerSettlementsPage />} />
                      <Route path="payments" element={<PartnerPaymentsPage />} />
                      <Route path="tenant-billing" element={<PartnerTenantBillingPage />} />
                      <Route path="tenant-billing/:tenantId" element={<PartnerTenantBillingPage />} />
                      <Route path="addons" element={<PartnerAddonsPage />} />
                      <Route path="coupons" element={<PartnerCouponsPage />} />
                      <Route path="notifications" element={<PartnerNotificationsPage />} />
                      <Route path="leads" element={<PartnerLeadsPage />} />
                      <Route path="users" element={<PartnerUsersPage />} />
                      <Route path="api-keys" element={<PartnerApiKeysPage />} />
                      <Route path="billing" element={<PartnerBillingPage />} />
                      <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
                    </Route>
                    
                    {/* Super Admin - outside tenant guard */}
                    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                      <Route path="/super-admin" element={<SuperAdmin />} />
                    </Route>

                    {/* Tenant routes - blocked for partner/super_admin context */}
                    <Route element={<ProtectedRoute><TenantRouteGuard><AppLayout /></TenantRouteGuard></ProtectedRoute>}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/pos" element={<POS />} />
                      <Route path="/tables" element={<Tables />} />
                      {/* Module-gated routes */}
                      <Route path="/comandas" element={<ModuleRouteGuard><Comandas /></ModuleRouteGuard>} />
                      <Route path="/events" element={<ModuleRouteGuard><Events /></ModuleRouteGuard>} />
                      <Route path="/kitchen" element={<ModuleRouteGuard><Kitchen /></ModuleRouteGuard>} />
                      <Route path="/deliveries" element={<ModuleRouteGuard><Deliveries /></ModuleRouteGuard>} />
                      <Route path="/stores" element={<ModuleRouteGuard><Stores /></ModuleRouteGuard>} />
                      <Route path="/marketing" element={<ModuleRouteGuard><Marketing /></ModuleRouteGuard>} />
                      {/* Standard routes */}
                      <Route path="/products" element={<Products />} />
                      <Route path="/stock" element={<Stock />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/billing" element={<TenantBilling />} />
                      <Route path="/billing/addons" element={<TenantBillingAddons />} />
                      <Route path="/billing/coupon" element={<TenantBillingCoupon />} />
                      <Route path="/courier-dashboard" element={<CourierDashboard />} />
                      <Route path="/stone" element={<StoneTenantPage />} />
                    </Route>
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ActiveStoreProvider>
              </BusinessCategoryProvider>
            </PartnerProvider>
          </AuthProvider>
        </PublicPartnerProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
