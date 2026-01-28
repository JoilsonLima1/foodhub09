import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from 'lucide-react';

const faqItems = [
  {
    question: "O que é o sistema e como funciona?",
    answer: "É uma plataforma completa de gestão para restaurantes que centraliza pedidos de múltiplas origens (PDV, WhatsApp, iFood, site), gerencia entregas, controla estoque, gera relatórios e muito mais. Tudo funciona na nuvem, acessível de qualquer dispositivo."
  },
  {
    question: "Preciso instalar algum programa no computador?",
    answer: "Não! O sistema funciona 100% na nuvem através do navegador. Basta acessar pelo celular, tablet ou computador. Não precisa instalar nada."
  },
  {
    question: "Quanto tempo leva para configurar o sistema?",
    answer: "Em menos de 10 minutos você pode cadastrar seus produtos e começar a vender. Oferecemos tutoriais em vídeo e suporte para ajudar na configuração inicial."
  },
  {
    question: "Posso testar antes de assinar?",
    answer: "Sim! Oferecemos um período de teste grátis com acesso a TODAS as funcionalidades. Você pode testar à vontade, sem precisar de cartão de crédito."
  },
  {
    question: "O sistema funciona sem internet?",
    answer: "O sistema precisa de internet para funcionar, pois é baseado na nuvem. Recomendamos ter uma conexão estável para melhor experiência."
  },
  {
    question: "Quantos usuários posso cadastrar?",
    answer: "Depende do plano escolhido. O plano Starter permite até 3 usuários, o Professional até 10, e o Enterprise oferece usuários ilimitados."
  },
  {
    question: "Consigo integrar com iFood e outros apps de delivery?",
    answer: "Sim! Temos integração nativa com iFood e outros marketplaces. Os pedidos entram automaticamente no sistema para você gerenciar em um só lugar."
  },
  {
    question: "Como funciona o controle de estoque?",
    answer: "O sistema permite cadastrar ingredientes e receitas. Quando uma venda é feita, o estoque é automaticamente atualizado. Você recebe alertas quando produtos estão acabando."
  },
  {
    question: "Posso usar minha impressora térmica atual?",
    answer: "Sim! O sistema é compatível com a maioria das impressoras térmicas do mercado. Também suporta balanças e leitores de código de barras."
  },
  {
    question: "Como funciona o app do entregador?",
    answer: "Os entregadores acessam um dashboard exclusivo pelo celular onde veem as entregas pendentes, podem aceitar corridas, marcar como entregue e visualizar histórico de ganhos."
  },
  {
    question: "O sistema gera nota fiscal?",
    answer: "O sistema gera recibos e pode ser integrado com sistemas de NF-e. Consulte nosso suporte para verificar compatibilidade com seu estado."
  },
  {
    question: "Posso personalizar o cardápio digital?",
    answer: "Sim! O cardápio digital é totalmente personalizável com fotos, descrições, preços e variações. Cada mesa pode ter um QR Code exclusivo."
  },
  {
    question: "Como funciona o painel da cozinha?",
    answer: "A cozinha recebe os pedidos em tempo real em um painel dedicado, podendo marcar o status de preparo. Funciona como um KDS (Kitchen Display System)."
  },
  {
    question: "Posso ter múltiplas unidades/filiais?",
    answer: "Sim! O plano Enterprise permite gerenciar múltiplas unidades com relatórios consolidados e gestão centralizada."
  },
  {
    question: "Quais formas de pagamento o PDV aceita?",
    answer: "O PDV aceita dinheiro, PIX, cartão de crédito e débito. Você pode configurar múltiplos meios de pagamento em uma mesma venda."
  },
  {
    question: "Os dados estão seguros?",
    answer: "Sim! Utilizamos criptografia de ponta a ponta, backups automáticos diários e servidores com certificação de segurança. Seus dados estão protegidos."
  },
  {
    question: "Posso exportar meus dados?",
    answer: "Sim! Todos os relatórios podem ser exportados em PDF ou Excel. Você tem total controle sobre seus dados."
  },
  {
    question: "Como funciona o suporte técnico?",
    answer: "Oferecemos suporte via WhatsApp, email e chat dentro do sistema. O tempo de resposta varia conforme o plano, mas todos recebem atendimento humanizado."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim! Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento sem multas ou taxas extras."
  },
  {
    question: "O que acontece se eu não renovar?",
    answer: "Seus dados ficam guardados por 30 dias. Se decidir voltar, tudo estará como deixou. Após esse período, os dados são removidos."
  },
  {
    question: "Como funciona a previsão de vendas com IA?",
    answer: "O sistema analisa seu histórico de vendas e padrões de comportamento para prever quanto você vai vender nos próximos dias, ajudando no planejamento de compras e equipe."
  },
  {
    question: "Posso criar cupons de desconto?",
    answer: "Sim! Você pode criar cupons com valor fixo ou percentual, definir validade, limite de uso e valor mínimo de pedido."
  },
  {
    question: "O sistema funciona em celular?",
    answer: "Sim! O sistema é totalmente responsivo e funciona perfeitamente em celulares, tablets e computadores."
  },
  {
    question: "Quanto custa para começar?",
    answer: "Temos um plano gratuito para você começar! Os planos pagos começam a partir de R$ 97/mês com período de teste grátis incluído."
  }
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 px-4 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Perguntas <span className="text-primary">Frequentes</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tire suas dúvidas sobre o sistema. Se não encontrar sua resposta, fale conosco pelo chat ou WhatsApp.
          </p>
        </div>

        <div className="bg-card rounded-3xl border border-border p-6 md:p-8">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left hover:text-primary py-6 gap-4">
                  <div className="flex items-start gap-4">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-medium">{item.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pl-9 pb-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
