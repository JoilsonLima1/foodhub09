import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download, Info } from 'lucide-react';

export default function Downloads() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Downloads</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            FoodHub Print Agent
          </CardTitle>
          <CardDescription>
            Serviço local para impressão 1-clique em impressoras térmicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Em breve!</p>
                <p className="text-xs">
                  O FoodHub Print Agent está em desenvolvimento. Enquanto isso, use a impressão pelo navegador
                  que já funciona em qualquer impressora térmica configurada no sistema operacional.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" disabled className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Windows (em breve)
            </Button>
            <Button variant="outline" disabled className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              macOS (em breve)
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Requisitos:</strong> Windows 10+ ou macOS 12+</p>
            <p><strong>Como funciona:</strong> O agente roda em segundo plano e recebe comandos de impressão diretamente do FoodHub, dispensando o diálogo de impressão do navegador.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
