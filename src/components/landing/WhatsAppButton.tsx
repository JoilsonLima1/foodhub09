import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phoneNumber: string;
  companyName: string;
  variant?: 'floating' | 'inline' | 'header';
  className?: string;
}

export function WhatsAppButton({ phoneNumber, companyName, variant = 'floating', className = '' }: WhatsAppButtonProps) {
  const handleClick = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Gostaria de saber mais sobre o ${companyName}`);
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  if (variant === 'floating') {
    return (
      <Button
        onClick={handleClick}
        className={`fixed bottom-6 left-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-[#25D366] hover:bg-[#128C7E] text-white ${className}`}
        size="icon"
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
    );
  }

  if (variant === 'header') {
    return (
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        className={`border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white ${className}`}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        WhatsApp
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={`bg-[#25D366] hover:bg-[#128C7E] text-white ${className}`}
    >
      <MessageCircle className="h-5 w-5 mr-2" />
      Falar pelo WhatsApp
    </Button>
  );
}
