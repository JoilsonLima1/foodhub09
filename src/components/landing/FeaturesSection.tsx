import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChefHat, 
  Truck, 
  BarChart3, 
  Shield, 
  CreditCard, 
  Package, 
  Users, 
  Bell, 
  Smartphone,
  Brain,
  QrCode,
  Printer
} from 'lucide-react';

const features = [
  {
    icon: ChefHat,
    title: 'Gestão de Pedidos',
    description: 'Unifique pedidos de múltiplas origens: online, PDV, WhatsApp e marketplaces em um só lugar.',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: Truck,
    title: 'Entregas Otimizadas',
    description: 'Dashboard para entregadores e gestão completa de rotas, status e entregas em tempo real.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Análises detalhadas de vendas, CMV, ticket médio, horários de pico e muito mais.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Shield,
    title: 'Antifraude Integrado',
    description: 'Sistema robusto de detecção de duplicidades e proteção total de pagamentos.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: CreditCard,
    title: 'PDV Completo',
    description: 'Ponto de venda intuitivo com suporte a múltiplos meios de pagamento e impressão de recibos.',
    color: 'from-primary to-yellow-500'
  },
  {
    icon: Package,
    title: 'Controle de Estoque',
    description: 'Gestão automática de insumos com alertas de estoque baixo e controle de CMV.',
    color: 'from-teal-500 to-green-500'
  },
  {
    icon: Users,
    title: 'Multi-usuários',
    description: 'Controle de acesso por função: admin, caixa, cozinha, entregador e mais.',
    color: 'from-indigo-500 to-violet-500'
  },
  {
    icon: Bell,
    title: 'Notificações Inteligentes',
    description: 'Alertas em tempo real para pedidos, metas atingidas e estoque crítico.',
    color: 'from-red-500 to-orange-500'
  },
  {
    icon: Smartphone,
    title: 'App do Entregador',
    description: 'Dashboard mobile exclusivo para entregadores com status e histórico de entregas.',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    icon: Brain,
    title: 'Previsões com IA',
    description: 'Inteligência artificial que prevê vendas e ajuda no planejamento do seu negócio.',
    color: 'from-violet-500 to-purple-500'
  },
  {
    icon: QrCode,
    title: 'Cardápio Digital',
    description: 'QR Code para mesas com cardápio interativo e pedidos pelo celular do cliente.',
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: Printer,
    title: 'Integração Hardware',
    description: 'Compatível com impressoras térmicas, balanças e leitores de código de barras.',
    color: 'from-gray-500 to-slate-600'
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Funcionalidades</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Tudo que você precisa em <span className="text-primary">um só lugar</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Uma plataforma completa para gerenciar seu negócio de alimentação do início ao fim.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group bg-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
            >
              <CardHeader className="pb-4">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
