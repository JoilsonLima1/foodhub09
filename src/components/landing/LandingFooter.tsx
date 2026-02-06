import { Link } from 'react-router-dom';
import { MessageCircle, Mail, MapPin } from 'lucide-react';
import { WhatsAppButton } from './WhatsAppButton';

interface LandingFooterProps {
  logoUrl: string;
  companyName: string;
  whatsappNumber?: string;
}

export function LandingFooter({ logoUrl, companyName, whatsappNumber }: LandingFooterProps) {
  return (
    <footer className="py-16 px-4 bg-card border-t border-border">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img src={logoUrl} alt={companyName} className="h-12 w-auto" />
              <span className="text-2xl font-bold text-primary">{companyName}</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Sistema completo de gestão para restaurantes. Simplifique suas operações e aumente suas vendas.
            </p>
            {whatsappNumber && (
              <WhatsAppButton 
                phoneNumber={whatsappNumber} 
                companyName={companyName}
                variant="inline"
                className="w-full sm:w-auto"
              />
            )}
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-6">Navegação</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/recursos" className="text-muted-foreground hover:text-primary transition-colors">
                  Recursos
                </Link>
              </li>
              <li>
                <Link to="/planos" className="text-muted-foreground hover:text-primary transition-colors">
                  Planos e Preços
                </Link>
              </li>
              <li>
                <Link to="/clientes" className="text-muted-foreground hover:text-primary transition-colors">
                  Nossos Clientes
                </Link>
              </li>
              <li>
                <Link to="/auth?tab=signup" className="text-muted-foreground hover:text-primary transition-colors">
                  Criar Loja Grátis
                </Link>
              </li>
              <li>
                <Link to="/auth?intent=login" className="text-muted-foreground hover:text-primary transition-colors">
                  Entrar
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold text-lg mb-6">Recursos</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Tutoriais em Vídeo
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-6">Contato</h4>
            <ul className="space-y-4">
              {whatsappNumber && (
                <li className="flex items-center gap-3 text-muted-foreground">
                  <MessageCircle className="h-5 w-5 text-[#25D366]" />
                  <span>{whatsappNumber}</span>
                </li>
              )}
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-5 w-5 text-primary" />
                <span>contato@{companyName.toLowerCase().replace(/\s/g, '')}.com</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Atendimento 100% online em todo o Brasil</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito com ❤️ para restaurantes brasileiros
          </p>
        </div>
      </div>
    </footer>
  );
}
