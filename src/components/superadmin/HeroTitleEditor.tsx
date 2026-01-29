import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface HeroTitleEditorProps {
  heroTitle: string;
  heroTitleHighlight: string;
  heroTitlePart3: string;
  heroTitlePart4: string;
  color1: string;
  color2: string;
  onChange: (values: {
    heroTitle: string;
    heroTitleHighlight: string;
    heroTitlePart3: string;
    heroTitlePart4: string;
    color1: string;
    color2: string;
  }) => void;
}

// Preset color suggestions
const colorPresets = [
  { label: 'Foreground', value: 'foreground' },
  { label: 'Primário', value: 'primary' },
  { label: 'Dourado', value: '47 97% 60%' },
  { label: 'Branco', value: '0 0% 100%' },
  { label: 'Preto', value: '0 0% 0%' },
  { label: 'Vermelho', value: '0 84% 60%' },
  { label: 'Azul', value: '217 91% 60%' },
  { label: 'Verde', value: '142 76% 36%' },
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      
      {/* Color Presets */}
      <div className="flex flex-wrap gap-2">
        {colorPresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`px-3 py-1.5 text-xs rounded-full border-2 transition-all ${
              value === preset.value 
                ? 'border-primary bg-primary/10 font-medium' 
                : 'border-muted hover:border-muted-foreground/30'
            }`}
          >
            <span 
              className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
              style={{ 
                backgroundColor: preset.value === 'foreground' 
                  ? 'hsl(var(--foreground))' 
                  : preset.value === 'primary'
                  ? 'hsl(var(--primary))'
                  : `hsl(${preset.value})` 
              }}
            />
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Color Input */}
      <div className="flex gap-2 items-center">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="47 97% 60%"
          className="flex-1 rounded-xl font-mono text-sm"
        />
        <div 
          className="w-12 h-10 rounded-xl border-2 flex-shrink-0 shadow-inner" 
          style={{ 
            backgroundColor: value === 'foreground' 
              ? 'hsl(var(--foreground))' 
              : value === 'primary'
              ? 'hsl(var(--primary))'
              : `hsl(${value})` 
          }}
        />
      </div>
    </div>
  );
}

function TitlePartEditor({
  label,
  description,
  partNumber,
  value,
  color,
  colorLabel,
  onChange,
}: {
  label: string;
  description: string;
  partNumber: number;
  value: string;
  color: string;
  colorLabel: string;
  onChange: (value: string) => void;
}) {
  const isHighlight = partNumber === 2 || partNumber === 4;
  
  return (
    <div className={`space-y-4 p-5 border-2 rounded-2xl transition-all ${
      isHighlight 
        ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/40 shadow-lg shadow-primary/10' 
        : 'bg-muted/30 border-muted-foreground/10 hover:border-muted-foreground/20'
    }`}>
      {/* Header with badge */}
      <div className="flex items-center gap-3">
        <Badge 
          variant={isHighlight ? "default" : "secondary"} 
          className={`rounded-full px-3 py-1 ${isHighlight ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {partNumber}
        </Badge>
        <div className="flex-1">
          <Label className={`font-semibold ${isHighlight ? 'text-lg text-primary' : ''}`}>{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {colorLabel}
        </Badge>
      </div>

      {/* Text Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Texto</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite o texto..."
          className={`rounded-xl ${isHighlight ? 'text-lg font-semibold border-primary/30 focus:border-primary' : ''}`}
        />
      </div>

      {/* Color Preview */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div 
          className="w-4 h-4 rounded-full border"
          style={{ 
            backgroundColor: color === 'foreground' 
              ? 'hsl(var(--foreground))' 
              : color === 'primary'
              ? 'hsl(var(--primary))'
              : `hsl(${color})` 
          }}
        />
        <span>Usa {colorLabel}</span>
      </div>
    </div>
  );
}

function HeroTitlePreview({ 
  parts, 
  color1, 
  color2 
}: { 
  parts: { part1: string; part2: string; part3: string; part4: string };
  color1: string;
  color2: string;
}) {
  const getColorStyle = (color: string) => {
    if (color === 'foreground') return 'hsl(var(--foreground))';
    if (color === 'primary') return 'hsl(var(--primary))';
    return `hsl(${color})`;
  };

  return (
    <div className="p-8 bg-gradient-to-br from-background via-background to-muted/50 rounded-3xl border-2 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-xs text-muted-foreground ml-2">Prévia ao Vivo</span>
      </div>
      
      <div className="text-center py-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
          <span style={{ color: getColorStyle(color1) }}>{parts.part1 || '...'} </span>
          <span style={{ color: getColorStyle(color2) }}>{parts.part2 || '...'} </span>
          <span style={{ color: getColorStyle(color1) }}>{parts.part3 || '...'} </span>
          <span className="relative" style={{ color: getColorStyle(color2) }}>
            {parts.part4 || '...'}
            <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 10" fill="none">
              <path d="M0 8 Q50 0, 100 8 T200 8" stroke="currentColor" strokeWidth="3" className="opacity-30"/>
            </svg>
          </span>
        </h1>
      </div>
    </div>
  );
}

export function HeroTitleEditor({ 
  heroTitle, 
  heroTitleHighlight, 
  heroTitlePart3,
  heroTitlePart4,
  color1,
  color2,
  onChange 
}: HeroTitleEditorProps) {
  const handleChange = (field: string, value: string) => {
    onChange({
      heroTitle: field === 'heroTitle' ? value : heroTitle,
      heroTitleHighlight: field === 'heroTitleHighlight' ? value : heroTitleHighlight,
      heroTitlePart3: field === 'heroTitlePart3' ? value : heroTitlePart3,
      heroTitlePart4: field === 'heroTitlePart4' ? value : heroTitlePart4,
      color1: field === 'color1' ? value : color1,
      color2: field === 'color2' ? value : color2,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-lg font-bold">Editor de Título Hero</Label>
          <p className="text-sm text-muted-foreground">
            Configure o título com 4 partes e 2 cores alternadas
          </p>
        </div>
        <Badge variant="outline" className="rounded-full">4 Partes</Badge>
      </div>

      {/* Preview First */}
      <HeroTitlePreview 
        parts={{
          part1: heroTitle,
          part2: heroTitleHighlight,
          part3: heroTitlePart3,
          part4: heroTitlePart4,
        }}
        color1={color1}
        color2={color2}
      />

      {/* Color Pickers */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-xl bg-muted/30">
          <ColorPicker
            label="Cor 1 (Partes 1 e 3)"
            value={color1}
            onChange={(v) => handleChange('color1', v)}
          />
        </div>
        <div className="p-4 border rounded-xl bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
          <ColorPicker
            label="Cor 2 (Partes 2 e 4 - Destaque)"
            value={color2}
            onChange={(v) => handleChange('color2', v)}
          />
        </div>
      </div>

      {/* Text Editors */}
      <div className="space-y-4">
        <TitlePartEditor
          label="Parte 1"
          description="Primeira parte do título"
          partNumber={1}
          value={heroTitle}
          color={color1}
          colorLabel="Cor 1"
          onChange={(v) => handleChange('heroTitle', v)}
        />

        <TitlePartEditor
          label="Parte 2 — Destaque"
          description="Segunda parte com destaque"
          partNumber={2}
          value={heroTitleHighlight}
          color={color2}
          colorLabel="Cor 2"
          onChange={(v) => handleChange('heroTitleHighlight', v)}
        />

        <TitlePartEditor
          label="Parte 3"
          description="Terceira parte do título"
          partNumber={3}
          value={heroTitlePart3}
          color={color1}
          colorLabel="Cor 1"
          onChange={(v) => handleChange('heroTitlePart3', v)}
        />

        <TitlePartEditor
          label="Parte 4 — Destaque Final"
          description="Quarta parte com sublinhado decorativo"
          partNumber={4}
          value={heroTitlePart4}
          color={color2}
          colorLabel="Cor 2"
          onChange={(v) => handleChange('heroTitlePart4', v)}
        />
      </div>
    </div>
  );
}
