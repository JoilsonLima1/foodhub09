import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Filter } from 'lucide-react';

interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  categoryId: string | null;
  categoryName: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface TopProductsChartWithFilterProps {
  products: TopProduct[];
  categories: Category[];
  selectedCategory: string | undefined;
  onCategoryChange: (categoryId: string | undefined) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function TopProductsChartWithFilter({ 
  products, 
  categories, 
  selectedCategory, 
  onCategoryChange 
}: TopProductsChartWithFilterProps) {
  if (products.length === 0 && !selectedCategory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum produto vendido no período</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart (truncate long names)
  const chartData = products.map((product) => ({
    ...product,
    name: product.productName.length > 20 
      ? product.productName.slice(0, 18) + '...' 
      : product.productName,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produtos Mais Vendidos
        </CardTitle>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(value) => onCategoryChange(value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum produto nesta categoria no período</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis 
                  type="number"
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const product = payload[0].payload as TopProduct;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="font-medium">{product.productName}</div>
                          {product.categoryName && (
                            <div className="text-xs text-muted-foreground">{product.categoryName}</div>
                          )}
                          <div className="text-primary font-bold">
                            {product.quantity} {product.quantity === 1 ? 'unidade' : 'unidades'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(product.revenue)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="quantity" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
