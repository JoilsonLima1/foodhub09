import { Card, CardContent } from '@/components/ui/card';
import { 
  Pizza, 
  UtensilsCrossed, 
  Coffee, 
  IceCream, 
  Beef, 
  Fish, 
  Salad, 
  Sandwich, 
  Cookie, 
  Wine, 
  Soup, 
  Cake 
} from 'lucide-react';

const categories = [
  { icon: Pizza, name: 'Pizzarias', description: 'Gestão completa de sabores e tamanhos' },
  { icon: UtensilsCrossed, name: 'Restaurantes', description: 'À la carte, buffet e self-service' },
  { icon: Coffee, name: 'Cafeterias', description: 'Controle de bebidas e combos' },
  { icon: Sandwich, name: 'Lanchonetes', description: 'Fast-food e delivery rápido' },
  { icon: Beef, name: 'Hamburguerias', description: 'Personalização de ingredientes' },
  { icon: Fish, name: 'Peixarias', description: 'Frutos do mar e pratos frescos' },
  { icon: Salad, name: 'Comida Saudável', description: 'Fit, vegano e vegetariano' },
  { icon: IceCream, name: 'Sorveterias', description: 'Sabores e complementos' },
  { icon: Cookie, name: 'Docerias', description: 'Bolos, doces e confeitaria' },
  { icon: Wine, name: 'Bares', description: 'Drinks e petiscos' },
  { icon: Soup, name: 'Caldos e Sopas', description: 'Pratos quentes e reconfortantes' },
  { icon: Cake, name: 'Padarias', description: 'Pães, salgados e conveniência' },
];

export function CategoriesSection() {
  return (
    <section id="categories" className="py-20 px-4 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Segmentos Atendidos</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Para <span className="text-primary">todos</span> os tipos de negócio
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Sistema adaptável para qualquer segmento do setor alimentício, com recursos específicos para cada tipo de operação.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <Card 
              key={index} 
              className="group bg-card/50 border-border hover:border-primary/50 hover:bg-card transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <CardContent className="p-6 text-center">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-300">
                  <category.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{category.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
