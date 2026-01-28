import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useCallback } from 'react';

export interface CategoryTheme {
  primary: string;
  accent: string;
  sidebar: string;
}

export interface CategoryTerminology {
  product: string;
  products: string;
  category: string;
  order: string;
  kitchen: string;
  table: string;
  menu: string;
}

export interface CategoryFeatures {
  tables: boolean;
  kitchen_display: boolean;
  delivery: boolean;
  pos: boolean;
  reservations: boolean;
  toppings?: boolean;
  pre_orders?: boolean;
  customizations?: boolean;
  location_tracking?: boolean;
}

export interface BusinessCategoryConfig {
  id: string;
  category_key: string;
  name: string;
  icon: string;
  description: string | null;
  theme: CategoryTheme;
  terminology: CategoryTerminology;
  features: CategoryFeatures;
  is_active: boolean;
  display_order: number;
}

// Default terminology fallback
const DEFAULT_TERMINOLOGY: CategoryTerminology = {
  product: 'Produto',
  products: 'Produtos',
  category: 'Categoria',
  order: 'Pedido',
  kitchen: 'Cozinha',
  table: 'Mesa',
  menu: 'Cardápio',
};

// Default features fallback
const DEFAULT_FEATURES: CategoryFeatures = {
  tables: true,
  kitchen_display: true,
  delivery: true,
  pos: true,
  reservations: false,
};

// Default theme (fallback for public/logged-out pages)
const DEFAULT_THEME: CategoryTheme = {
  primary: '45 100% 50%',
  accent: '45 80% 95%',
  sidebar: '0 0% 5%',
};

export function useBusinessCategories() {
  return useQuery({
    queryKey: ['business-categories'],
    queryFn: async (): Promise<BusinessCategoryConfig[]> => {
      const { data, error } = await supabase
        .from('business_category_configs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        category_key: item.category_key,
        name: item.name,
        icon: item.icon,
        description: item.description,
        theme: item.theme as unknown as CategoryTheme,
        terminology: item.terminology as unknown as CategoryTerminology,
        features: item.features as unknown as CategoryFeatures,
        is_active: item.is_active ?? true,
        display_order: item.display_order ?? 0,
      }));
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

// Storage key for tenant-specific theme
const THEME_STORAGE_KEY = 'tenant-theme';

// Apply theme to CSS variables (only when authenticated)
function applyThemeToDOM(theme: CategoryTheme) {
  const root = document.documentElement;
  if (theme.primary) {
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--ring', theme.primary);
    root.style.setProperty('--sidebar-primary', theme.primary);
  }
  if (theme.accent) {
    root.style.setProperty('--accent', theme.accent);
  }
  if (theme.sidebar) {
    root.style.setProperty('--sidebar-background', theme.sidebar);
  }
}

// Reset theme to defaults (for public pages)
export function resetThemeToDefault() {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--sidebar-primary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--sidebar-background');
  localStorage.removeItem(THEME_STORAGE_KEY);
}

export function useTenantCategory() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tenant's current category
  const { data: tenantCategory, isLoading: isTenantLoading } = useQuery({
    queryKey: ['tenant-category', tenantId],
    queryFn: async () => {
      if (!tenantId) return 'restaurant';

      const { data, error } = await supabase
        .from('tenants')
        .select('business_category')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data?.business_category || 'restaurant';
    },
    enabled: !!tenantId,
  });

  // Fetch all categories
  const { data: categories, isLoading: isCategoriesLoading } = useBusinessCategories();

  // Get current category config
  const currentConfig = categories?.find(c => c.category_key === tenantCategory) || null;

  // Memoized theme application
  const applyTheme = useCallback((theme: CategoryTheme, saveTenantId?: string) => {
    applyThemeToDOM(theme);
    // Save to localStorage for this tenant only
    if (saveTenantId) {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ tenantId: saveTenantId, theme }));
    }
  }, []);

  // Update tenant category - NO password confirmation here (handled by component)
  const updateCategory = useMutation({
    mutationFn: async (categoryKey: string) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { data, error } = await supabase
        .from('tenants')
        .update({ business_category: categoryKey })
        .eq('id', tenantId)
        .select('business_category')
        .single();

      if (error) throw error;
      return data.business_category as string;
    },
    onSuccess: (newCategory) => {
      // Immediately update the cache with new value
      queryClient.setQueryData(['tenant-category', tenantId], newCategory);
      
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['tenant-category', tenantId] });
      
      toast({
        title: 'Categoria atualizada',
        description: 'A categoria do seu negócio foi alterada com sucesso.',
      });

      // Apply theme changes for this tenant only
      const newConfig = categories?.find(c => c.category_key === newCategory);
      if (newConfig?.theme && tenantId) {
        applyTheme(newConfig.theme, tenantId);
      }
    },
    onError: (error) => {
      console.error('Erro ao atualizar categoria:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Apply theme on load - only if authenticated and has tenant
  useEffect(() => {
    if (!user || !tenantId) {
      // Not authenticated - reset to default theme
      resetThemeToDefault();
      return;
    }

    // Check if we have a cached theme for this specific tenant
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) {
      try {
        const parsed = JSON.parse(storedTheme);
        // Only apply if it's for this tenant
        if (parsed.tenantId === tenantId && parsed.theme) {
          applyThemeToDOM(parsed.theme);
          return;
        }
      } catch (e) {
        // Invalid stored theme, continue to apply from config
      }
    }

    // Apply theme from current config
    if (currentConfig?.theme) {
      applyTheme(currentConfig.theme, tenantId);
    }
  }, [currentConfig, user, tenantId, applyTheme]);

  return {
    tenantCategory,
    currentConfig,
    categories,
    isLoading: isTenantLoading || isCategoriesLoading,
    updateCategory,
    // Helpers for terminology
    t: (key: keyof CategoryTerminology): string => {
      return currentConfig?.terminology?.[key] || DEFAULT_TERMINOLOGY[key];
    },
    // Helpers for features
    hasFeature: (feature: keyof CategoryFeatures): boolean => {
      return currentConfig?.features?.[feature] ?? DEFAULT_FEATURES[feature as keyof typeof DEFAULT_FEATURES] ?? false;
    },
  };
}

// Super Admin hook for managing all categories
export function useManageBusinessCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allCategories, isLoading } = useQuery({
    queryKey: ['all-business-categories'],
    queryFn: async (): Promise<BusinessCategoryConfig[]> => {
      const { data, error } = await supabase
        .from('business_category_configs')
        .select('*')
        .order('display_order');

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        category_key: item.category_key,
        name: item.name,
        icon: item.icon,
        description: item.description,
        theme: item.theme as unknown as CategoryTheme,
        terminology: item.terminology as unknown as CategoryTerminology,
        features: item.features as unknown as CategoryFeatures,
        is_active: item.is_active ?? true,
        display_order: item.display_order ?? 0,
      }));
    },
  });

  const updateCategoryConfig = useMutation({
    mutationFn: async (config: Partial<BusinessCategoryConfig> & { id: string }) => {
      const { id, ...updates } = config;
      
      // Prepare update object with proper typing
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.display_order !== undefined) updateData.display_order = updates.display_order;
      if (updates.theme !== undefined) updateData.theme = JSON.parse(JSON.stringify(updates.theme));
      if (updates.terminology !== undefined) updateData.terminology = JSON.parse(JSON.stringify(updates.terminology));
      if (updates.features !== undefined) updateData.features = JSON.parse(JSON.stringify(updates.features));
      
      const { error } = await supabase
        .from('business_category_configs')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-business-categories'] });
      queryClient.invalidateQueries({ queryKey: ['business-categories'] });
      toast({
        title: 'Categoria atualizada',
        description: 'As configurações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createCategory = useMutation({
    mutationFn: async (config: Omit<BusinessCategoryConfig, 'id'>) => {
      const { error } = await supabase
        .from('business_category_configs')
        .insert([{
          category_key: config.category_key,
          name: config.name,
          icon: config.icon,
          description: config.description,
          theme: JSON.parse(JSON.stringify(config.theme)),
          terminology: JSON.parse(JSON.stringify(config.terminology)),
          features: JSON.parse(JSON.stringify(config.features)),
          is_active: config.is_active,
          display_order: config.display_order,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-business-categories'] });
      queryClient.invalidateQueries({ queryKey: ['business-categories'] });
      toast({
        title: 'Categoria criada',
        description: 'Nova categoria adicionada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    categories: allCategories,
    isLoading,
    updateCategoryConfig,
    createCategory,
  };
}
