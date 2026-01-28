import { 
  Zap, 
  Clock, 
  TrendingUp, 
  HeadphonesIcon, 
  Lock, 
  RefreshCw, 
  Globe, 
  Wallet,
  Star
} from 'lucide-react';

const advantages = [
  {
    icon: Zap,
    title: 'Setup em Minutos',
    description: 'Configure seu sistema em menos de 10 minutos e comece a vender imediatamente.'
  },
  {
    icon: Clock,
    title: 'Disponível 24/7',
    description: 'Sistema na nuvem sempre disponível, acesse de qualquer lugar a qualquer hora.'
  },
  {
    icon: TrendingUp,
    title: 'Aumente suas Vendas',
    description: 'Clientes relatam aumento médio de 30% nas vendas após 3 meses de uso.'
  },
  {
    icon: HeadphonesIcon,
    title: 'Suporte Humanizado',
    description: 'Equipe especializada em gastronomia para ajudar você a crescer.'
  },
  {
    icon: Lock,
    title: 'Dados Seguros',
    description: 'Criptografia de ponta e backups automáticos para proteger seu negócio.'
  },
  {
    icon: RefreshCw,
    title: 'Atualizações Gratuitas',
    description: 'Novas funcionalidades e melhorias sem custo adicional, sempre evoluindo.'
  },
  {
    icon: Globe,
    title: 'Acesso Remoto',
    description: 'Monitore seu negócio de qualquer lugar do mundo pelo celular ou computador.'
  },
  {
    icon: Wallet,
    title: 'ROI Garantido',
    description: 'O sistema se paga em poucos dias com a economia de tempo e aumento de eficiência.'
  }
];

export function AdvantagesSection() {
  return (
    <section id="advantages" className="py-20 px-4 bg-gradient-to-b from-card/50 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50"></div>
      
      <div className="container mx-auto max-w-7xl relative">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Por que escolher</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Vantagens que fazem a <span className="text-primary">diferença</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Descubra por que centenas de restaurantes escolheram nossa plataforma para crescer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {advantages.map((advantage, index) => (
            <div key={index} className="group text-center p-6">
              <div className="relative inline-block mb-6">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <advantage.icon className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
              </div>
              <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{advantage.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{advantage.description}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">500+</div>
            <div className="text-muted-foreground">Restaurantes Ativos</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">1M+</div>
            <div className="text-muted-foreground">Pedidos Processados</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-muted-foreground">Uptime Garantido</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-4xl md:text-5xl font-bold text-primary mb-2">
              4.9 <Star className="h-8 w-8 fill-primary" />
            </div>
            <div className="text-muted-foreground">Avaliação Média</div>
          </div>
        </div>
      </div>
    </section>
  );
}
