import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { 
  useTenantCategory, 
  CategoryTerminology, 
  CategoryFeatures, 
  CategoryTheme,
  BusinessCategoryConfig 
} from '@/hooks/useBusinessCategory';

interface BusinessCategoryContextType {
  // Current category config
  currentConfig: BusinessCategoryConfig | null;
  tenantCategory: string | undefined;
  isLoading: boolean;
  
  // Terminology helper - get translated label
  t: (key: keyof CategoryTerminology) => string;
  
  // Feature helper - check if feature is enabled
  hasFeature: (feature: keyof CategoryFeatures) => boolean;
  
  // Theme
  theme: CategoryTheme | null;
  
  // Update category
  updateCategory: (categoryKey: string) => void;
}

const BusinessCategoryContext = createContext<BusinessCategoryContextType | null>(null);

interface BusinessCategoryProviderProps {
  children: ReactNode;
}

export function BusinessCategoryProvider({ children }: BusinessCategoryProviderProps) {
  const { 
    tenantCategory, 
    currentConfig, 
    isLoading, 
    updateCategory: updateCategoryMutation,
    t,
    hasFeature,
  } = useTenantCategory();

  const updateCategory = (categoryKey: string) => {
    updateCategoryMutation.mutate(categoryKey);
  };

  const value: BusinessCategoryContextType = {
    currentConfig,
    tenantCategory,
    isLoading,
    t,
    hasFeature,
    theme: currentConfig?.theme || null,
    updateCategory,
  };

  return (
    <BusinessCategoryContext.Provider value={value}>
      {children}
    </BusinessCategoryContext.Provider>
  );
}

export function useBusinessCategoryContext() {
  const context = useContext(BusinessCategoryContext);
  if (!context) {
    throw new Error('useBusinessCategoryContext must be used within BusinessCategoryProvider');
  }
  return context;
}

// Convenience hook for just terminology
export function useTerminology() {
  const { t } = useBusinessCategoryContext();
  return t;
}

// Convenience hook for just features
export function useFeatures() {
  const { hasFeature } = useBusinessCategoryContext();
  return hasFeature;
}
