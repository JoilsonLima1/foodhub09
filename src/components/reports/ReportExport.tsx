import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface SalesByPaymentMethod {
  method: string;
  label: string;
  total: number;
  count: number;
}

interface DailySales {
  date: string;
  total: number;
  count: number;
}

interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  byPaymentMethod: SalesByPaymentMethod[];
  dailySales: DailySales[];
}

interface ProductCost {
  productName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CMVReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  products: ProductCost[];
}

interface TopProduct {
  productName: string;
  quantity: number;
  revenue: number;
}

interface ReportExportProps {
  salesReport?: SalesReport | null;
  cmvReport?: CMVReport | null;
  topProducts?: TopProduct[];
  period: number;
  companyName?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function ReportExport({ salesReport, cmvReport, topProducts, period, companyName = 'FoodHub09' }: ReportExportProps) {
  const exportToCSV = () => {
    const lines: string[] = [];
    
    // Header with company name
    lines.push(companyName);
    lines.push(`Relatório de Vendas - Últimos ${period} dias`);
    lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push('');
    
    if (salesReport) {
      // Summary
      lines.push('=== RESUMO ===');
      lines.push(`Faturamento Total;${formatCurrency(salesReport.totalRevenue)}`);
      lines.push(`Total de Pedidos;${salesReport.totalOrders}`);
      lines.push(`Ticket Médio;${formatCurrency(salesReport.averageTicket)}`);
      lines.push('');
      
      // Daily Sales
      lines.push('=== VENDAS POR DIA ===');
      lines.push('Data;Valor;Pedidos');
      salesReport.dailySales.forEach((day) => {
        lines.push(`${day.date};${formatCurrency(day.total)};${day.count}`);
      });
      lines.push('');
      
      // Payment Methods
      lines.push('=== VENDAS POR FORMA DE PAGAMENTO ===');
      lines.push('Forma de Pagamento;Valor;Pedidos');
      salesReport.byPaymentMethod.forEach((method) => {
        lines.push(`${method.label};${formatCurrency(method.total)};${method.count}`);
      });
      lines.push('');
    }
    
    if (topProducts && topProducts.length > 0) {
      lines.push('=== PRODUTOS MAIS VENDIDOS ===');
      lines.push('Produto;Quantidade;Receita');
      topProducts.forEach((product) => {
        lines.push(`${product.productName};${product.quantity};${formatCurrency(product.revenue)}`);
      });
      lines.push('');
    }
    
    if (cmvReport) {
      lines.push('=== CMV - CUSTO DE MERCADORIA VENDIDA ===');
      lines.push(`Receita Total;${formatCurrency(cmvReport.totalRevenue)}`);
      lines.push(`Custo Total (CMV);${formatCurrency(cmvReport.totalCost)}`);
      lines.push(`Lucro Bruto;${formatCurrency(cmvReport.totalProfit)}`);
      lines.push(`Margem Geral;${cmvReport.overallMargin.toFixed(1)}%`);
      lines.push('');
      lines.push('Produto;Qtd;Receita;Custo;Lucro;Margem');
      cmvReport.products.forEach((product) => {
        lines.push(`${product.productName};${product.quantitySold};${formatCurrency(product.revenue)};${formatCurrency(product.cost)};${formatCurrency(product.profit)};${product.margin.toFixed(1)}%`);
      });
    }
    
    // Create and download file
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-vendas-${period}dias-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const exportToJSON = () => {
    const data = {
      company: companyName,
      generatedAt: new Date().toISOString(),
      period: `${period} dias`,
      sales: salesReport,
      topProducts,
      cmv: cmvReport,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-vendas-${period}dias-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Relatório exportado com sucesso!');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <Download className="h-4 w-4 mr-2" />
          Exportar JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
