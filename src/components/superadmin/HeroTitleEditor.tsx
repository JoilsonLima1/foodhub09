import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HeroTitlePart, HeroTitleHighlightStyle } from '@/hooks/useSystemSettings';

interface HeroTitleEditorProps {
  titleParts: {
    top: HeroTitlePart;
    middle: HeroTitlePart;
    bottom: HeroTitlePart;
  };
  onChange: (parts: { top: HeroTitlePart; middle: HeroTitlePart; bottom: HeroTitlePart }) => void;
}

const highlightStyles: { value: HeroTitleHighlightStyle; label: string; description: string }[] = [
  { value: 'none', label: 'Nenhum', description: 'Texto simples' },
  { value: 'underline', label: 'Sublinhado', description: 'Linha decorativa' },
  { value: 'rounded', label: 'Arredondado', description: 'Fundo arredondado' },
  { value: 'pill', label: 'Pílula', description: 'Fundo em cápsula' },
  { value: 'thought', label: 'Pensamento', description: 'Balão de pensamento' },
  { value: 'bubble', label: 'Bolha', description: 'Bolha de diálogo' },
  { value: 'marker', label: 'Marcador', description: 'Efeito marca-texto' },
  { value: 'glow', label: 'Brilho', description: 'Efeito luminoso' },
  { value: 'gradient', label: 'Gradiente', description: 'Texto gradiente' },
  { value: 'box', label: 'Caixa', description: 'Borda quadrada' },
  { value: 'circle', label: 'Círculo', description: 'Fundo circular' },
  { value: 'scratch', label: 'Riscado', description: 'Efeito rabisco' },
];

function TitlePartEditor({
  label,
  description,
  part,
  onChange,
  isMiddle = false,
}: {
  label: string;
  description: string;
  part: HeroTitlePart;
  onChange: (part: HeroTitlePart) => void;
  isMiddle?: boolean;
}) {
  return (
    <div className={`space-y-4 p-4 border rounded-lg ${isMiddle ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}>
      <div>
        <Label className={`font-semibold ${isMiddle ? 'text-lg' : ''}`}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {/* Text Input */}
      <div className="space-y-2">
        <Label>Texto</Label>
        <Input
          value={part.text}
          onChange={(e) => onChange({ ...part, text: e.target.value })}
          placeholder="Digite o texto..."
          className={isMiddle ? 'text-lg font-semibold' : ''}
        />
      </div>

      {/* Color Input */}
      <div className="space-y-2">
        <Label>Cor (HSL)</Label>
        <div className="flex gap-2">
          <Input
            value={part.color}
            onChange={(e) => onChange({ ...part, color: e.target.value })}
            placeholder="47 97% 60%"
            className="flex-1"
          />
          <div 
            className="w-10 h-10 rounded border flex-shrink-0" 
            style={{ backgroundColor: `hsl(${part.color})` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use "inherit" para usar a cor padrão do tema
        </p>
      </div>

      {/* Highlight Style */}
      <div className="space-y-2">
        <Label>Estilo de Destaque</Label>
        <RadioGroup
          value={part.highlight_style}
          onValueChange={(value: HeroTitleHighlightStyle) => onChange({ ...part, highlight_style: value })}
          className="grid gap-2 grid-cols-3 sm:grid-cols-4"
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
                className="flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all text-center hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
              >
                <span className="text-xs font-medium">{style.label}</span>
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
    const textColor = part.color === 'inherit' ? 'inherit' : `hsl(${part.color})`;
    const sizeClass = size === 'lg' ? 'text-2xl md:text-3xl' : size === 'sm' ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
    
    const getHighlightClasses = () => {
      switch (part.highlight_style) {
        case 'underline':
          return 'border-b-4 border-current pb-1';
        case 'rounded':
          return 'bg-current/15 px-4 py-1 rounded-xl';
        case 'pill':
          return 'bg-current/15 px-6 py-1 rounded-full';
        case 'thought':
          return 'relative bg-current/10 px-4 py-2 rounded-2xl before:content-[""] before:absolute before:-bottom-2 before:left-4 before:w-4 before:h-4 before:bg-current/10 before:rounded-full after:content-[""] after:absolute after:-bottom-4 after:left-2 after:w-2 after:h-2 after:bg-current/10 after:rounded-full';
        case 'bubble':
          return 'relative bg-current/15 px-4 py-2 rounded-2xl before:content-[""] before:absolute before:-bottom-2 before:left-6 before:border-8 before:border-transparent before:border-t-current/15';
        case 'marker':
          return 'bg-gradient-to-r from-yellow-300/50 to-yellow-200/30 px-2 py-0.5 -skew-x-2';
        case 'glow':
          return 'drop-shadow-[0_0_20px_currentColor]';
        case 'gradient':
          return 'bg-gradient-to-r from-current to-primary bg-clip-text text-transparent';
        case 'box':
          return 'border-2 border-current px-4 py-1';
        case 'circle':
          return 'bg-current/15 px-6 py-2 rounded-full inline-flex items-center justify-center';
        case 'scratch':
          return 'relative before:content-[""] before:absolute before:inset-0 before:bg-current/10 before:-skew-y-1 before:rounded';
        default:
          return '';
      }
    };

    return (
      <span 
        className={`${sizeClass} font-bold ${getHighlightClasses()} inline-block`}
        style={{ color: textColor }}
      >
        {part.text || '...'}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-background to-muted rounded-xl border">
      <Label className="text-xs text-muted-foreground mb-4 block">Prévia ao Vivo:</Label>
      <div className="text-center space-y-2">
        {/* Top - Smaller */}
        <div>{renderPart(parts.top, 'sm')}</div>
        {/* Middle - Larger (Main Highlight) */}
        <div>{renderPart(parts.middle, 'lg')}</div>
        {/* Bottom - Medium */}
        <div>{renderPart(parts.bottom, 'md')}</div>
      </div>
    </div>
  );
}

export function HeroTitleEditor({ titleParts, onChange }: HeroTitleEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Editor de Título Hero (3 Partes)</Label>
        <p className="text-sm text-muted-foreground">
          Configure cada linha do título com texto, cor e estilo de destaque personalizados
        </p>
      </div>

      {/* Preview First */}
      <HeroTitlePreview parts={titleParts} />

      {/* Editors */}
      <div className="space-y-4">
        <TitlePartEditor
          label="1. Linha Superior"
          description="Primeira linha do título (texto menor)"
          part={titleParts.top}
          onChange={(part) => onChange({ ...titleParts, top: part })}
        />

        <TitlePartEditor
          label="2. Linha Central (Destaque Principal)"
          description="Linha central com maior destaque - tamanho maior"
          part={titleParts.middle}
          onChange={(part) => onChange({ ...titleParts, middle: part })}
          isMiddle={true}
        />

        <TitlePartEditor
          label="3. Linha Inferior"
          description="Terceira linha do título"
          part={titleParts.bottom}
          onChange={(part) => onChange({ ...titleParts, bottom: part })}
        />
      </div>
    </div>
  );
}
