import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Type, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppearance, FontSize } from '@/hooks/useAppearance';

const fontSizeOptions: { id: FontSize; label: string; description: string }[] = [
  { id: 'small', label: 'Pequeno', description: '14px - Mais compacto' },
  { id: 'medium', label: 'Médio', description: '16px - Padrão' },
  { id: 'large', label: 'Grande', description: '18px - Maior legibilidade' },
];

export function AppearanceSettings() {
  const { fontSize, setFontSize } = useAppearance();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          Tamanho da Fonte
        </CardTitle>
        <CardDescription>
          Ajuste o tamanho do texto para melhor legibilidade
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fontSizeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setFontSize(option.id)}
              className={cn(
                'relative p-4 rounded-lg border-2 transition-all hover:scale-105 text-left',
                fontSize === option.id
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="font-semibold"
                  style={{ fontSize: option.id === 'small' ? '14px' : option.id === 'medium' ? '16px' : '18px' }}
                >
                  Aa
                </span>
                <span className="font-medium">{option.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
              {fontSize === option.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 rounded-lg border bg-card">
          <Label className="text-sm text-muted-foreground mb-2 block">Prévia:</Label>
          <p
            className="font-medium"
            style={{ fontSize: fontSize === 'small' ? '14px' : fontSize === 'medium' ? '16px' : '18px' }}
          >
            Este é um exemplo de como o texto ficará com o tamanho selecionado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
