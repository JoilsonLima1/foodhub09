import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Warehouse,
  Plus,
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
} from 'lucide-react';
import { UNIT_LABELS, STOCK_MOVEMENT_LABELS } from '@/lib/constants';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  is_active: boolean;
}

export default function Stock() {
  const { tenantId } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const fetchIngredients = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, [tenantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatStock = (value: number, unit: string) => {
    return `${value.toFixed(2)} ${unit}`;
  };

  const isLowStock = (ingredient: Ingredient) => 
    ingredient.current_stock <= ingredient.min_stock;

  const filteredIngredients = ingredients.filter((ingredient) => {
    if (showLowStockOnly && !isLowStock(ingredient)) return false;
    if (!searchTerm) return true;
    return ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const lowStockCount = ingredients.filter(isLowStock).length;
  const totalValue = ingredients.reduce(
    (sum, ing) => sum + ing.current_stock * ing.cost_per_unit,
    0
  );

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhum restaurante configurado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6" />
            Estoque
          </h1>
          <p className="text-muted-foreground">
            Gerencie insumos e movimentações
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Entrada
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Insumo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Insumos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ingredients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant={showLowStockOnly ? 'default' : 'outline'}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Estoque Baixo ({lowStockCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum insumo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || showLowStockOnly
                  ? 'Tente ajustar os filtros'
                  : 'Comece adicionando insumos ao estoque'}
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Insumo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead>Estoque Mínimo</TableHead>
                  <TableHead>Custo Unitário</TableHead>
                  <TableHead>Valor em Estoque</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell>
                      <div className="font-medium">{ingredient.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className={isLowStock(ingredient) ? 'text-destructive font-semibold' : ''}>
                        {formatStock(ingredient.current_stock, ingredient.unit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatStock(ingredient.min_stock, ingredient.unit)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(ingredient.cost_per_unit)}/{ingredient.unit}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(ingredient.current_stock * ingredient.cost_per_unit)}
                    </TableCell>
                    <TableCell>
                      {isLowStock(ingredient) ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success border-success/20">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
