import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { usePublicSubscribers, PublicSubscriber } from '@/hooks/usePublicSubscribers';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { WhatsAppButton } from '@/components/landing/WhatsAppButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, MapPin, Search, Store, Users } from 'lucide-react';
import fallbackLogo from '@/assets/logo.png';

export default function PublicClientes() {
  useEffect(() => {
    resetThemeToDefault();
  }, []);
  
  usePublicTheme();
  
  const { branding } = usePublicSettings();
  const { subscribers, byCategory, isLoading, totalCount } = usePublicSubscribers();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';
  
  // Get unique categories
  const categories = Object.keys(byCategory).sort();
  
  // Filter subscribers
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = search === '' || 
      sub.name.toLowerCase().includes(search.toLowerCase()) ||
      sub.city?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || sub.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <LandingHeader 
        logoUrl={logoUrl} 
        companyName={companyName}
      />

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            <Users className="h-3 w-3 mr-1" />
            Nossos Clientes
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Empresas que <span className="text-primary">confiam</span> no {companyName}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Conheça alguns dos estabelecimentos que utilizam nossa plataforma para gerenciar seus negócios com eficiência.
          </p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalCount}+</div>
              <div className="text-sm text-muted-foreground">Lojas Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{categories.length}</div>
              <div className="text-sm text-muted-foreground">Categorias</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Subscribers Grid */}
      <section className="py-16">
        <div className="container px-4 mx-auto">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-12 w-12 rounded-full mb-4" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-16">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum estabelecimento encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSubscribers.map((sub) => (
                <SubscriberCard key={sub.id} subscriber={sub} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Quer fazer parte dessa lista?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Crie sua loja gratuitamente e comece a gerenciar seu negócio de forma profissional.
          </p>
          <Link 
            to="/auth?tab=signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Criar Loja Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter 
        logoUrl={logoUrl}
        companyName={companyName}
      />

      {/* Floating WhatsApp */}
      <WhatsAppButton 
        phoneNumber="" 
        companyName={companyName}
        variant="floating"
      />
    </div>
  );
}

function SubscriberCard({ subscriber }: { subscriber: PublicSubscriber }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {subscriber.logo_url ? (
            <img 
              src={subscriber.logo_url} 
              alt={subscriber.name}
              className="h-12 w-12 rounded-full object-cover bg-muted"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{subscriber.name}</h3>
            {subscriber.category_name && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {subscriber.category_name}
              </Badge>
            )}
            {(subscriber.city || subscriber.state) && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {[subscriber.city, subscriber.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
