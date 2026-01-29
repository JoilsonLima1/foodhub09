import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HeroTitlePart, HeroTitleHighlightStyle } from '@/hooks/useSystemSettings';
import { Badge } from '@/components/ui/badge';

interface HeroTitleEditorProps {
  titleParts: {
    top: HeroTitlePart;
    middle: HeroTitlePart;
    bottom: HeroTitlePart;
  };
  onChange: (parts: { top: HeroTitlePart; middle: HeroTitlePart; bottom: HeroTitlePart }) => void;
}

const highlightStyles: { value: HeroTitleHighlightStyle; label: string; description: string; icon: string }[] = [
  { value: 'none', label: 'Nenhum', description: 'Texto simples', icon: '—' },
  { value: 'underline', label: 'Sublinhado', description: 'Linha decorativa', icon: '⎯' },
  { value: 'rounded', label: 'Arredondado', description: 'Fundo arredondado', icon: '◯' },
  { value: 'pill', label: 'Pílula', description: 'Fundo em cápsula', icon: '💊' },
  { value: 'thought', label: 'Pensamento', description: 'Balão de pensamento', icon: '💭' },
  { value: 'bubble', label: 'Bolha', description: 'Bolha de diálogo', icon: '💬' },
  { value: 'marker', label: 'Marcador', description: 'Efeito marca-texto', icon: '🖍️' },
  { value: 'glow', label: 'Brilho', description: 'Efeito luminoso', icon: '✨' },
  { value: 'gradient', label: 'Gradiente', description: 'Texto gradiente', icon: '🌈' },
  { value: 'box', label: 'Caixa', description: 'Borda quadrada', icon: '▢' },
  { value: 'circle', label: 'Círculo', description: 'Fundo circular', icon: '●' },
  { value: 'scratch', label: 'Riscado', description: 'Efeito rabisco', icon: '〰️' },
];

// Preset color suggestions
const colorPresets = [
  { label: 'Dourado', value: '47 97% 60%' },
  { label: 'Primário', value: 'inherit' },
  { label: 'Branco', value: '0 0% 100%' },
  { label: 'Preto', value: '0 0% 0%' },
  { label: 'Vermelho', value: '0 84% 60%' },
  { label: 'Azul', value: '217 91% 60%' },
  { label: 'Verde', value: '142 76% 36%' },
  { label: 'Rosa', value: '330 81% 60%' },
];

function TitlePartEditor({
  label,
  description,
  partNumber,
  part,
  onChange,
  isMiddle = false,
}: {
  label: string;
  description: string;
  partNumber: number;
  part: HeroTitlePart;
  onChange: (part: HeroTitlePart) => void;
  isMiddle?: boolean;
}) {
  return (
    <div className={`space-y-4 p-5 border-2 rounded-2xl transition-all ${
      isMiddle 
        ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/40 shadow-lg shadow-primary/10' 
        : 'bg-muted/30 border-muted-foreground/10 hover:border-muted-foreground/20'
    }`}>
      {/* Header with badge */}
      <div className="flex items-center gap-3">
        <Badge 
          variant={isMiddle ? "default" : "secondary"} 
          className={`rounded-full px-3 py-1 ${isMiddle ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {partNumber}
        </Badge>
        <div>
          <Label className={`font-semibold ${isMiddle ? 'text-lg text-primary' : ''}`}>{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Text Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Texto</Label>
        <Input
          value={part.text}
          onChange={(e) => onChange({ ...part, text: e.target.value })}
          placeholder="Digite o texto..."
          className={`rounded-xl ${isMiddle ? 'text-lg font-semibold border-primary/30 focus:border-primary' : ''}`}
        />
      </div>

      {/* Color Input with Presets */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Cor</Label>
        
        {/* Color Presets */}
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange({ ...part, color: preset.value })}
              className={`px-3 py-1.5 text-xs rounded-full border-2 transition-all ${
                part.color === preset.value 
                  ? 'border-primary bg-primary/10 font-medium' 
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <span 
                className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                style={{ backgroundColor: preset.value === 'inherit' ? 'hsl(var(--primary))' : `hsl(${preset.value})` }}
              />
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Color Input */}
        <div className="flex gap-2 items-center">
          <Input
            value={part.color}
            onChange={(e) => onChange({ ...part, color: e.target.value })}
            placeholder="47 97% 60%"
            className="flex-1 rounded-xl font-mono text-sm"
          />
          <div 
            className="w-12 h-10 rounded-xl border-2 flex-shrink-0 shadow-inner" 
            style={{ 
              backgroundColor: part.color === 'inherit' 
                ? 'hsl(var(--primary))' 
                : `hsl(${part.color})` 
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use "inherit" para usar a cor padrão do tema ou insira HSL personalizado
        </p>
      </div>

      {/* Highlight Style */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Estilo de Destaque</Label>
        <RadioGroup
          value={part.highlight_style}
          onValueChange={(value: HeroTitleHighlightStyle) => onChange({ ...part, highlight_style: value })}
          className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
        >
          {highlightStyles.map((style) => (
            <div key={style.value} className="relative">
              <RadioGroupItem
                value={style.value}
                id={`style-${label}-${style.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`style-${label}-${style.value}`}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-center hover:bg-muted hover:border-muted-foreground/30 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-md"
              >
                <span className="text-lg">{style.icon}</span>
                <span className="text-xs font-medium leading-tight">{style.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

function HeroTitlePreview({ parts }: { parts: { top: HeroTitlePart; middle: HeroTitlePart; bottom: HeroTitlePart } }) {
  const renderPart = (part: HeroTitlePart, size: 'sm' | 'lg' | 'md' = 'md') => {
    const textColor = part.color === 'inherit' ? 'hsl(var(--primary))' : `hsl(${part.color})`;
    const sizeClass = size === 'lg' ? 'text-3xl md:text-4xl' : size === 'sm' ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
    
    const getHighlightClasses = () => {
      switch (part.highlight_style) {
        case 'underline':
          return 'border-b-4 border-current pb-1';
        case 'rounded':
          return 'bg-current/15 px-5 py-2 rounded-2xl';
        case 'pill':
          return 'bg-current/15 px-7 py-2 rounded-full';
        case 'thought':
          return 'relative bg-current/10 px-5 py-3 rounded-[2rem] before:content-[""] before:absolute before:-bottom-2 before:left-6 before:w-5 before:h-5 before:bg-current/10 before:rounded-full after:content-[""] after:absolute after:-bottom-5 after:left-3 after:w-3 after:h-3 after:bg-current/10 after:rounded-full';
        case 'bubble':
          return 'relative bg-current/15 px-5 py-3 rounded-[1.5rem] before:content-[""] before:absolute before:-bottom-3 before:left-8 before:border-[12px] before:border-transparent before:border-t-current/15';
        case 'marker':
          return 'bg-gradient-to-r from-yellow-300/50 to-yellow-200/30 px-3 py-1 -skew-x-2 rounded-lg';
        case 'glow':
          return 'drop-shadow-[0_0_25px_currentColor] drop-shadow-[0_0_50px_currentColor]';
        case 'gradient':
          return 'bg-gradient-to-r from-current via-accent to-primary bg-clip-text text-transparent';
        case 'box':
          return 'border-3 border-current px-5 py-2 rounded-xl';
        case 'circle':
          return 'bg-current/15 px-8 py-3 rounded-full inline-flex items-center justify-center';
        case 'scratch':
          return 'relative before:content-[""] before:absolute before:inset-0 before:bg-current/10 before:-skew-y-2 before:rounded-xl before:-z-10';
        default:
          return '';
      }
    };

    return (
      <span 
        className={`${sizeClass} font-bold ${getHighlightClasses()} inline-block leading-relaxed`}
        style={{ color: textColor }}
      >
        {part.text || '...'}
      </span>
    );
  };

  return (
    <div className="p-8 bg-gradient-to-br from-background via-background to-muted/50 rounded-3xl border-2 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-xs text-muted-foreground ml-2">Prévia ao Vivo</span>
      </div>
      
      <div className="text-center space-y-3 py-4">
        {/* Top - Smaller */}
        <div className="animate-fade-in">{renderPart(parts.top, 'sm')}</div>
        {/* Middle - Larger (Main Highlight) */}
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>{renderPart(parts.middle, 'lg')}</div>
        {/* Bottom - Medium */}
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>{renderPart(parts.bottom, 'md')}</div>
      </div>
    </div>
  );
}

export function HeroTitleEditor({ titleParts, onChange }: HeroTitleEditorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-lg font-bold">Editor de Título Hero</Label>
          <p className="text-sm text-muted-foreground">
            Configure cada linha com texto, cor e estilo de destaque únicos
          </p>
        </div>
        <Badge variant="outline" className="rounded-full">3 Partes</Badge>
      </div>

      {/* Preview First */}
      <HeroTitlePreview parts={titleParts} />

      {/* Editors */}
      <div className="space-y-4">
        <TitlePartEditor
          label="Linha Superior"
          description="Primeira linha do título (texto menor)"
          partNumber={1}
          part={titleParts.top}
          onChange={(part) => onChange({ ...titleParts, top: part })}
        />

        <TitlePartEditor
          label="Linha Central — Destaque Principal"
          description="Linha central com maior destaque visual"
          partNumber={2}
          part={titleParts.middle}
          onChange={(part) => onChange({ ...titleParts, middle: part })}
          isMiddle={true}
        />

        <TitlePartEditor
          label="Linha Inferior"
          description="Terceira linha do título"
          partNumber={3}
          part={titleParts.bottom}
          onChange={(part) => onChange({ ...titleParts, bottom: part })}
        />
      </div>
    </div>
  );
}
