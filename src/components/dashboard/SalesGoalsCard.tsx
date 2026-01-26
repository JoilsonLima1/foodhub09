import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Target, TrendingUp, Calendar, Plus, Trophy } from 'lucide-react';
import { useSalesGoals } from '@/hooks/useSalesGoals';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function SalesGoalsCard() {
  const { dailyGoal, weeklyGoal, isLoading, createGoal } = useSalesGoals();
  const [dailyTarget, setDailyTarget] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateGoals = () => {
    if (dailyTarget) {
      createGoal('daily', parseFloat(dailyTarget));
    }
    if (weeklyTarget) {
      createGoal('weekly', parseFloat(weeklyTarget));
    }
    setDailyTarget('');
    setWeeklyTarget('');
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 75) return 'bg-info';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-muted';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Metas de Vendas
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Definir Metas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Definir Metas de Vendas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Meta Diária
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 5000"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Meta Semanal
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 30000"
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateGoals} className="w-full">
                Salvar Metas
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Meta Diária
            </span>
            {dailyGoal.percentage >= 100 && (
              <Trophy className="h-4 w-4 text-success" />
            )}
          </div>
          {dailyGoal.goal ? (
            <>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(dailyGoal.currentAmount)}</span>
                <span>{formatCurrency(dailyGoal.goal.target_amount)}</span>
              </div>
              <Progress
                value={dailyGoal.percentage}
                className="h-2"
              />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {dailyGoal.percentage.toFixed(0)}% atingido
                </span>
                {dailyGoal.remaining > 0 && (
                  <span className="text-muted-foreground">
                    Faltam {formatCurrency(dailyGoal.remaining)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma meta diária definida
            </p>
          )}
        </div>

        {/* Weekly Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Meta Semanal
            </span>
            {weeklyGoal.percentage >= 100 && (
              <Trophy className="h-4 w-4 text-success" />
            )}
          </div>
          {weeklyGoal.goal ? (
            <>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(weeklyGoal.currentAmount)}</span>
                <span>{formatCurrency(weeklyGoal.goal.target_amount)}</span>
              </div>
              <Progress
                value={weeklyGoal.percentage}
                className="h-2"
              />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {weeklyGoal.percentage.toFixed(0)}% atingido
                </span>
                {weeklyGoal.remaining > 0 && (
                  <span className="text-muted-foreground">
                    Faltam {formatCurrency(weeklyGoal.remaining)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma meta semanal definida
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
