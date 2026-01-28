import { Grid, List, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type POSDisplayMode = 'list' | 'grid_images';

interface POSDisplayModeToggleProps {
  mode: POSDisplayMode;
  onChange: (mode: POSDisplayMode) => void;
  allowChange: boolean;
  compact?: boolean;
}

export function POSDisplayModeToggle({
  mode,
  onChange,
  allowChange,
  compact = false,
}: POSDisplayModeToggleProps) {
  if (!allowChange) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
        <Button
          variant={mode === 'list' ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange('list')}
          title="Lista"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={mode === 'grid_images' ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange('grid_images')}
          title="Grade com Imagens"
        >
          <Grid className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {mode === 'grid_images' ? (
            <Grid className="h-4 w-4" />
          ) : (
            <List className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {mode === 'grid_images' ? 'Grade' : 'Lista'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onChange('list')} className="gap-2">
          <List className="h-4 w-4" />
          Lista Normal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('grid_images')} className="gap-2">
          <Grid className="h-4 w-4" />
          Grade com Imagens
          <span className="text-xs text-muted-foreground ml-2">
            (Sorveteria, Açaiteria)
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
