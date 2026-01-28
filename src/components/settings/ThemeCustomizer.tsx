import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Palette, RotateCcw, Check, Shield, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface ColorPreset {
  id: string;
  name: string;
  primary: string;
  sidebar: string;
  accent: string;
}

const colorPresets: ColorPreset[] = [
  {
    id: 'gold-black',
    name: 'Preto & Dourado',
    primary: '45 100% 50%',
    sidebar: '0 0% 5%',
    accent: '45 80% 95%',
  },
  {
    id: 'blue-corporate',
    name: 'Azul Corporativo',
    primary: '220 70% 45%',
    sidebar: '220 25% 12%',
    accent: '210 100% 96%',
  },
  {
    id: 'green-nature',
    name: 'Verde Natural',
    primary: '142 72% 40%',
    sidebar: '142 30% 10%',
    accent: '142 50% 95%',
  },
  {
    id: 'red-vibrant',
    name: 'Vermelho Vibrante',
    primary: '0 72% 51%',
    sidebar: '0 20% 8%',
    accent: '0 50% 95%',
  },
  {
    id: 'purple-luxury',
    name: 'Roxo Luxuoso',
    primary: '280 65% 50%',
    sidebar: '280 30% 10%',
    accent: '280 50% 95%',
  },
  {
    id: 'orange-warm',
    name: 'Laranja Quente',
    primary: '30 90% 50%',
    sidebar: '30 30% 8%',
    accent: '30 70% 95%',
  },
];

interface ThemeCustomizerProps {
  isSuperAdmin?: boolean;
}

export function ThemeCustomizer({ isSuperAdmin = false }: ThemeCustomizerProps) {
  const { colors, updateSetting, isLoading } = useSystemSettings();
  const [selectedPreset, setSelectedPreset] = useState<string>('gold-black');
  const [customPrimary, setCustomPrimary] = useState('#FFD700');
  const [customSidebar, setCustomSidebar] = useState('#0D0D0D');
  const [customAccent, setCustomAccent] = useState('#FFF8E7');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved colors on mount
  useEffect(() => {
    if (colors) {
      const primaryHex = hslToHex(colors.primary);
      const secondaryHex = hslToHex(colors.secondary);
      const accentHex = hslToHex(colors.accent);
      
      setCustomPrimary(primaryHex);
      setCustomSidebar(secondaryHex);
      setCustomAccent(accentHex);
      
      // Check if it matches a preset
      const matchingPreset = colorPresets.find(
        p => p.primary === colors.primary && p.sidebar === colors.secondary && p.accent === colors.accent
      );
      
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.id);
        setIsCustomMode(false);
      } else {
        setIsCustomMode(true);
        setSelectedPreset('');
      }
      
      // Apply colors to CSS
      applyColorsToCSS(colors.primary, colors.secondary, colors.accent);
    }
  }, [colors]);

  const applyColorsToCSS = (primary: string, sidebar: string, accent: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--sidebar-background', sidebar);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--sidebar-primary', primary);
  };

  const applyPreset = (preset: ColorPreset) => {
    setSelectedPreset(preset.id);
    setIsCustomMode(false);
    setCustomPrimary(hslToHex(preset.primary));
    setCustomSidebar(hslToHex(preset.sidebar));
    setCustomAccent(hslToHex(preset.accent));
    applyColorsToCSS(preset.primary, preset.sidebar, preset.accent);
  };

  const hexToHSL = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const hslToHex = (hsl: string): string => {
    const parts = hsl.match(/(\d+\.?\d*)/g);
    if (!parts || parts.length < 3) return '#000000';
    
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const applyCustomColors = () => {
    setIsCustomMode(true);
    setSelectedPreset('');
    
    const primaryHSL = hexToHSL(customPrimary);
    const sidebarHSL = hexToHSL(customSidebar);
    const accentHSL = hexToHSL(customAccent);
    
    applyColorsToCSS(primaryHSL, sidebarHSL, accentHSL);
  };

  const saveColors = async () => {
    setIsSaving(true);
    try {
      const primaryHSL = isCustomMode ? hexToHSL(customPrimary) : colorPresets.find(p => p.id === selectedPreset)?.primary || hexToHSL(customPrimary);
      const sidebarHSL = isCustomMode ? hexToHSL(customSidebar) : colorPresets.find(p => p.id === selectedPreset)?.sidebar || hexToHSL(customSidebar);
      const accentHSL = isCustomMode ? hexToHSL(customAccent) : colorPresets.find(p => p.id === selectedPreset)?.accent || hexToHSL(customAccent);
      
      await updateSetting.mutateAsync({
        key: 'colors',
        value: {
          primary: primaryHSL,
          secondary: sidebarHSL,
          accent: accentHSL,
        }
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaultPreset = colorPresets[0];
    applyPreset(defaultPreset);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Temas Predefinidos
          </CardTitle>
          <CardDescription>
            Escolha um tema pronto para aplicar ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {colorPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={cn(
                  'relative p-4 rounded-lg border-2 transition-all hover:scale-105',
                  selectedPreset === preset.id && !isCustomMode
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex gap-1 mb-3 justify-center">
                  <div
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: `hsl(${preset.primary})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: `hsl(${preset.sidebar})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: `hsl(${preset.accent})` }}
                  />
                </div>
                <p className="text-sm font-medium text-center">{preset.name}</p>
                {selectedPreset === preset.id && !isCustomMode && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cores Personalizadas</CardTitle>
          <CardDescription>
            Crie sua própria paleta de cores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Cor Principal</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  placeholder="#FFD700"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sidebar-color">Cor da Sidebar</Label>
              <div className="flex gap-2">
                <Input
                  id="sidebar-color"
                  type="color"
                  value={customSidebar}
                  onChange={(e) => setCustomSidebar(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={customSidebar}
                  onChange={(e) => setCustomSidebar(e.target.value)}
                  placeholder="#0D0D0D"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent-color">Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  placeholder="#FFF8E7"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-2">Prévia:</p>
            <div className="flex gap-2 items-center">
              <div
                className="w-16 h-10 rounded flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: customPrimary,
                  color: '#000',
                }}
              >
                Botão
              </div>
              <div
                className="w-16 h-10 rounded flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: customSidebar,
                  color: '#fff',
                }}
              >
                Sidebar
              </div>
              <div
                className="w-16 h-10 rounded flex items-center justify-center text-xs font-medium border"
                style={{
                  backgroundColor: customAccent,
                  color: '#333',
                }}
              >
                Accent
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyCustomColors} variant="outline" className="flex-1">
              Visualizar
            </Button>
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <Button onClick={saveColors} disabled={isSaving || isLoading} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Cores no Sistema
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Configurações Globais (Super Admin)
            </CardTitle>
            <CardDescription>
              Aplique um tema padrão para todos os novos tenants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Forçar Tema Padrão</Label>
                <p className="text-sm text-muted-foreground">
                  Novos clientes receberão automaticamente o tema selecionado
                </p>
              </div>
              <Button variant="outline" size="sm">
                Definir como Padrão
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Permitir Customização</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir que tenants personalizem suas cores
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
