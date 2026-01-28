import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatWidgetProps {
  companyName: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showFloatingButton?: boolean;
}

export function AIChatWidget({ companyName, isOpen: controlledIsOpen, onOpenChange, showFloatingButton = true }: AIChatWidgetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
  };
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá! 👋 Sou o assistente virtual do ${companyName}. Posso ajudar com dúvidas sobre o sistema, funcionalidades, planos e preços. Como posso ajudar você hoje?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const systemPrompt = `Você é o assistente virtual do ${companyName}, um sistema de gestão para restaurantes. Responda de forma amigável, clara e profissional.

INFORMAÇÕES DO SISTEMA:
- Sistema completo de gestão para restaurantes, pizzarias, lanchonetes, cafeterias e similares
- Funciona 100% na nuvem, acessível de qualquer dispositivo
- Principais recursos: PDV, gestão de pedidos, controle de estoque, dashboard de entregas, relatórios, previsão com IA
- Integração com iFood e outros marketplaces
- Suporte a impressoras térmicas, balanças e leitores de código de barras
- Cardápio digital com QR Code para mesas
- App exclusivo para entregadores

PLANOS:
- Grátis: Até 1 usuário, PDV básico, 20 produtos, 50 pedidos/mês
- Starter (R$ 97/mês): Até 3 usuários, PDV completo, cozinha, entregas, relatórios básicos
- Professional (R$ 197/mês): Até 10 usuários, estoque, CMV, app entregador, relatórios avançados
- Enterprise (R$ 397/mês): Usuários ilimitados, IA, metas, multi-unidades, API, white label

Todos os planos pagos incluem período de teste grátis.

REGRAS:
- Responda apenas sobre o sistema e seus recursos
- Se não souber a resposta, sugira entrar em contato pelo WhatsApp
- Use emojis moderadamente para ser mais amigável
- Mantenha respostas concisas (máximo 3-4 frases)
- Sempre incentive a experimentar o teste grátis`;

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [...messages, { role: 'user', content: userMessage }],
          systemPrompt 
        }
      });

      if (response.error) throw response.error;

      const assistantMessage = response.data?.message || 'Desculpe, não consegui processar sua mensagem. Tente novamente.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente ou entre em contato pelo WhatsApp.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    if (!showFloatingButton) return null;
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl shadow-primary/30 z-50 animate-bounce hover:animate-none"
        size="icon"
      >
        <Bot className="h-8 w-8" />
      </Button>
    );
  }

  return (
    <Card className={`fixed z-50 shadow-2xl border-primary/20 overflow-hidden transition-all duration-300 ${
      isMinimized 
        ? 'bottom-6 right-6 w-72 h-14' 
        : 'bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)]'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold">Assistente Virtual</h3>
            {!isMinimized && <p className="text-xs opacity-80">Online • Responde em segundos</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background h-[calc(500px-140px)]">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-muted rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
