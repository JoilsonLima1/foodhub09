import { useEffect } from 'react';
import { usePublicSettings } from '@/hooks/usePublicSettings';

/**
 * Hook that applies the public theme colors from system settings to the landing page.
 * This ensures the landing page reflects the super admin's branding configuration.
 */
export function usePublicTheme() {
  const { colors, isLoading } = usePublicSettings();

  useEffect(() => {
    if (isLoading || !colors) return;

    const root = document.documentElement;

    // Apply primary color
    if (colors.primary) {
      root.style.setProperty('--primary', colors.primary);
      root.style.setProperty('--ring', colors.primary);
      root.style.setProperty('--sidebar-primary', colors.primary);
      root.style.setProperty('--warning', colors.primary);
      root.style.setProperty('--chart-1', colors.primary);
    }

    // Apply secondary color (sidebar/card backgrounds)
    if (colors.secondary) {
      root.style.setProperty('--sidebar-background', colors.secondary);
    }

    // Apply accent color
    if (colors.accent) {
      root.style.setProperty('--accent', colors.accent);
      root.style.setProperty('--accent-foreground', colors.primary);
    }
  }, [colors, isLoading]);
}
