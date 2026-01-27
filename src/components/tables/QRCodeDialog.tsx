import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Copy, ExternalLink, QrCode } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Table } from '@/hooks/useTables';

interface QRCodeDialogProps {
  table: Table;
  menuUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeDialog({ table, menuUrl, open, onOpenChange }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate QR Code URL using a public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      toast({ title: 'Link copiado!' });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-mesa-${table.number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'QR Code baixado!' });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Mesa ${table.number}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 48px;
              margin: 0 0 20px;
            }
            h2 {
              font-size: 24px;
              color: #666;
              margin: 0 0 30px;
            }
            img {
              width: 300px;
              height: 300px;
            }
            p {
              margin-top: 30px;
              font-size: 18px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Mesa ${table.number}</h1>
            ${table.name ? `<h2>${table.name}</h2>` : ''}
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p>Escaneie para ver o cardápio</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code - Mesa {table.number}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* QR Code Image */}
          <div 
            ref={canvasRef}
            className="bg-white p-4 rounded-lg border"
          >
            <img
              src={qrCodeUrl}
              alt={`QR Code para Mesa ${table.number}`}
              className="w-64 h-64"
            />
          </div>

          {/* Table Info */}
          <div className="text-center">
            <p className="text-lg font-bold">Mesa {table.number}</p>
            {table.name && (
              <p className="text-muted-foreground">{table.name}</p>
            )}
          </div>

          {/* URL Input */}
          <div className="w-full space-y-2">
            <Label>Link do Cardápio</Label>
            <div className="flex gap-2">
              <Input
                value={menuUrl}
                readOnly
                className="text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => window.open(menuUrl, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Cardápio
          </Button>
          <Button variant="outline" onClick={handleDownloadQR}>
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
          <Button onClick={handlePrint}>
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
