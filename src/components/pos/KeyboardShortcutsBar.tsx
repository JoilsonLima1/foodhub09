import { Keyboard, Scan, Scale, CreditCard, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ShortcutInfo {
  key: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

interface KeyboardShortcutsBarProps {
  shortcuts: ShortcutInfo[];
  className?: string;
}

const defaultIcons: Record<string, React.ReactNode> = {
  'F2': <Scan className="h-3 w-3" />,
  'F3': <Scale className="h-3 w-3" />,
  'F4': <CreditCard className="h-3 w-3" />,
  'F8': <Trash2 className="h-3 w-3" />,
};

export function KeyboardShortcutsBar({ shortcuts, className }: KeyboardShortcutsBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        "flex items-center gap-0.5 px-1.5 py-px bg-muted/30 border rounded text-[9px]",
        className
      )}>
        <Keyboard className="h-2.5 w-2.5 text-muted-foreground" />
        
        {shortcuts.map((shortcut) => (
          <Tooltip key={shortcut.key}>
            <TooltipTrigger asChild>
              <Badge 
                variant={shortcut.isActive ? "default" : "secondary"}
                className={cn(
                  "gap-0.5 cursor-default transition-colors px-1 py-0 h-4 text-[9px]",
                  shortcut.isActive && "ring-1 ring-primary/50"
                )}
              >
                {shortcut.icon || defaultIcons[shortcut.key]}
                <kbd className="font-mono font-semibold">{shortcut.key}</kbd>
                <span className="hidden md:inline">{shortcut.label}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">{shortcut.label}</p>
              <p className="text-xs text-muted-foreground">{shortcut.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
