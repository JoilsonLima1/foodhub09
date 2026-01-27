import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  byPaymentMethod: { label: string; total: number; count: number }[];
  dailySales: { date: string; total: number; count: number }[];
}

interface CMVReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  products: {
    productName: string;
    quantitySold: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
}

interface TopProduct {
  productName: string;
  quantity: number;
  revenue: number;
}

interface ReportPDFExportProps {
  salesReport?: SalesReport | null;
  cmvReport?: CMVReport | null;
  topProducts?: TopProduct[];
  period: number;
  companyName?: string;
  logoUrl?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function ReportPDFExport({
  salesReport,
  cmvReport,
  topProducts,
  period,
  companyName = 'FoodHub09',
  logoUrl,
}: ReportPDFExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async (type: 'complete' | 'sales' | 'cmv') => {
    setIsExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(`Relatório de Vendas - Últimos ${period} dias`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Sales Summary
      if ((type === 'complete' || type === 'sales') && salesReport) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumo de Vendas', 14, yPosition);
        yPosition += 10;

        autoTable(doc, {
          startY: yPosition,
          head: [['Métrica', 'Valor']],
          body: [
            ['Faturamento Total', formatCurrency(salesReport.totalRevenue)],
            ['Total de Pedidos', salesReport.totalOrders.toString()],
            ['Ticket Médio', formatCurrency(salesReport.averageTicket)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        // Payment Methods
        if (salesReport.byPaymentMethod.length > 0) {
          doc.setFontSize(14);
          doc.text('Vendas por Forma de Pagamento', 14, yPosition);
          yPosition += 10;

          autoTable(doc, {
            startY: yPosition,
            head: [['Forma de Pagamento', 'Valor', 'Pedidos']],
            body: salesReport.byPaymentMethod.map((method) => [
              method.label,
              formatCurrency(method.total),
              method.count.toString(),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }

        // Daily Sales
        if (salesReport.dailySales.length > 0) {
          doc.setFontSize(14);
          doc.text('Vendas por Dia', 14, yPosition);
          yPosition += 10;

          autoTable(doc, {
            startY: yPosition,
            head: [['Data', 'Valor', 'Pedidos']],
            body: salesReport.dailySales.map((day) => [
              day.date,
              formatCurrency(day.total),
              day.count.toString(),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }
      }

      // Top Products
      if ((type === 'complete' || type === 'sales') && topProducts && topProducts.length > 0) {
        // Check if we need a new page
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('Produtos Mais Vendidos', 14, yPosition);
        yPosition += 10;

        autoTable(doc, {
          startY: yPosition,
          head: [['Produto', 'Quantidade', 'Receita']],
          body: topProducts.slice(0, 10).map((product) => [
            product.productName,
            product.quantity.toString(),
            formatCurrency(product.revenue),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // CMV Report
      if ((type === 'complete' || type === 'cmv') && cmvReport) {
        // Check if we need a new page
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('CMV - Custo de Mercadoria Vendida', 14, yPosition);
        yPosition += 10;

        autoTable(doc, {
          startY: yPosition,
          head: [['Métrica', 'Valor']],
          body: [
            ['Receita Total', formatCurrency(cmvReport.totalRevenue)],
            ['Custo Total (CMV)', formatCurrency(cmvReport.totalCost)],
            ['Lucro Bruto', formatCurrency(cmvReport.totalProfit)],
            ['Margem Geral', `${cmvReport.overallMargin.toFixed(1)}%`],
          ],
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        // Products CMV
        if (cmvReport.products.length > 0) {
          doc.setFontSize(14);
          doc.text('Análise por Produto', 14, yPosition);
          yPosition += 10;

          autoTable(doc, {
            startY: yPosition,
            head: [['Produto', 'Qtd', 'Receita', 'Custo', 'Lucro', 'Margem']],
            body: cmvReport.products.slice(0, 15).map((product) => [
              product.productName.substring(0, 25),
              product.quantitySold.toString(),
              formatCurrency(product.revenue),
              formatCurrency(product.cost),
              formatCurrency(product.profit),
              `${product.margin.toFixed(1)}%`,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            columnStyles: {
              0: { cellWidth: 50 },
            },
          });
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${pageCount} | ${companyName} - Relatório Confidencial`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      const fileName = `relatorio-${type}-${period}dias-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToPDF('complete')}>
          <FileText className="h-4 w-4 mr-2" />
          Relatório Completo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF('sales')}>
          <FileText className="h-4 w-4 mr-2" />
          Apenas Vendas
        </DropdownMenuItem>
        {cmvReport && (
          <DropdownMenuItem onClick={() => exportToPDF('cmv')}>
            <FileText className="h-4 w-4 mr-2" />
            Apenas CMV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
