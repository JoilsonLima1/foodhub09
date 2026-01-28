import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Scale, ScanBarcode, Usb, Monitor, Settings, CheckCircle2, AlertCircle, Info, Chrome, Printer, Download, ExternalLink, Wifi, Cable } from 'lucide-react';

export function HardwareTutorial() {
  const handleTestPrint = () => {
    const testContent = `
      <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 10pt; width: 80mm; margin: 0; padding: 5mm; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 5mm 0; }
            h1 { font-size: 14pt; margin: 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1>TESTE DE IMPRESSÃO</h1>
            <p>FoodHub09</p>
          </div>
          <div class="line"></div>
          <p>Se você está vendo esta página impressa corretamente, sua impressora está configurada!</p>
          <div class="line"></div>
          <p class="center">Data: ${new Date().toLocaleString('pt-BR')}</p>
          <div class="line"></div>
          <p class="center">✓ Impressora OK</p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=300,height=400');
    if (printWindow) {
      printWindow.document.write(testContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Impressora Térmica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Configuração da Impressora Térmica
          </CardTitle>
          <CardDescription>
            Tutorial para instalação e configuração de impressoras térmicas para cupons e recibos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Impressão via Navegador</AlertTitle>
            <AlertDescription>
              O sistema utiliza impressão nativa do navegador. Basta configurar a impressora como padrão 
              no Windows/Mac/Linux para imprimir cupons automaticamente.
            </AlertDescription>
          </Alert>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="models">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Impressoras Compatíveis
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-muted-foreground">
                  O sistema é compatível com qualquer impressora térmica que funcione com o sistema operacional:
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Epson</h4>
                    <p className="text-sm text-muted-foreground">TM-T20, TM-T88, TM-M30</p>
                    <Badge className="mt-2" variant="default">Recomendado</Badge>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Elgin</h4>
                    <p className="text-sm text-muted-foreground">i7, i9, VOX</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Bematech</h4>
                    <p className="text-sm text-muted-foreground">MP-4200 TH, MP-2800 TH</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Outras</h4>
                    <p className="text-sm text-muted-foreground">Qualquer impressora térmica 58mm ou 80mm</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="connection">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Cable className="h-4 w-4" />
                  Passo 1: Conexão Física
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Usb className="h-4 w-4" />
                    Impressora USB (Mais Comum):
                  </h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Conecte o cabo USB da impressora ao computador</li>
                    <li>Ligue a impressora</li>
                    <li>O Windows detectará automaticamente (aguarde alguns segundos)</li>
                    <li>Se o driver não instalar automaticamente, baixe do site do fabricante</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Impressora de Rede/Wi-Fi:
                  </h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Conecte a impressora à mesma rede do computador</li>
                    <li>Descubra o IP da impressora (geralmente impresso ao ligar)</li>
                    <li>Adicione a impressora via Painel de Controle → Impressoras</li>
                    <li>Use "Adicionar impressora de rede" e insira o IP</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="driver">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Passo 2: Instalação do Driver
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-medium">Links para Download de Drivers:</h4>
                  <div className="space-y-2">
                    <a 
                      href="https://epson.com.br/Suporte/Impressoras/Impressoras-POS/T%C3%A9rmicas/s/SPT_ThermalReceipt" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Epson - Drivers Impressoras Térmicas
                    </a>
                    <a 
                      href="https://www.elgin.com.br/automacao/downloads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Elgin - Central de Downloads
                    </a>
                    <a 
                      href="https://www.bematech.com.br/suporte" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Bematech - Suporte e Downloads
                    </a>
                  </div>
                </div>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>Acesse o site do fabricante da sua impressora</li>
                  <li>Localize o modelo exato e baixe o driver para seu sistema (Windows 10/11)</li>
                  <li>Execute o instalador como Administrador</li>
                  <li>Siga as instruções na tela e reinicie se solicitado</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="config">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Passo 3: Configurar como Padrão
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Windows 10/11:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Pressione <Badge variant="outline">Win + I</Badge> para abrir Configurações</li>
                    <li>Vá em <strong>Bluetooth e dispositivos → Impressoras e scanners</strong></li>
                    <li>Clique na sua impressora térmica</li>
                    <li>Clique em <strong>"Definir como padrão"</strong></li>
                  </ol>
                </div>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium">Configurações Recomendadas do Papel:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Largura do Papel:</span>
                    <Badge variant="secondary">80mm (padrão) ou 58mm</Badge>
                    <span>Margens:</span>
                    <Badge variant="secondary">Mínimas (2-3mm)</Badge>
                    <span>Orientação:</span>
                    <Badge variant="secondary">Retrato</Badge>
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Para cupons menores, configure o tamanho do papel como "Personalizado" 
                    e defina 80mm x 297mm (ou o comprimento desejado).
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="chrome">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Chrome className="h-4 w-4" />
                  Passo 4: Configurar Navegador
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Para impressão automática sem diálogo, configure o Chrome:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>Abra o Chrome e vá em <strong>chrome://settings/printing</strong></li>
                  <li>Ative a opção <strong>"Usar destino de impressão padrão"</strong></li>
                  <li>Na primeira impressão, marque <strong>"Lembrar minha escolha"</strong></li>
                </ol>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-medium mb-2">Dica para Impressão Silenciosa:</h4>
                  <p className="text-sm text-muted-foreground">
                    Você pode usar o atalho <Badge variant="outline">Ctrl + P</Badge> para abrir a impressão 
                    e depois <Badge variant="outline">Enter</Badge> para confirmar rapidamente.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="test">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Passo 5: Testar Impressão
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Clique no botão abaixo para imprimir uma página de teste:
                </p>
                <Button onClick={handleTestPrint} className="w-full sm:w-auto">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Página de Teste
                </Button>
                <Alert variant="default">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Se a página de teste imprimir corretamente, sua impressora está pronta! 
                    Os cupons do PDV serão impressos automaticamente ao finalizar vendas.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Balança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Configuração da Balança
          </CardTitle>
          <CardDescription>
            Tutorial para instalação e configuração de balanças via porta serial (USB/RS-232)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Chrome className="h-4 w-4" />
            <AlertTitle>Requisito do Navegador</AlertTitle>
            <AlertDescription>
              A integração com balança utiliza a <strong>Web Serial API</strong>, disponível apenas no 
              <strong> Google Chrome</strong>, <strong>Microsoft Edge</strong> e <strong>Opera</strong> (versão 89+).
            </AlertDescription>
          </Alert>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="models">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Balanças Compatíveis
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-muted-foreground">
                  O sistema suporta balanças que utilizam protocolo serial padrão:
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Toledo / Prix</h4>
                    <p className="text-sm text-muted-foreground">Prix 3, Prix 4, Prix 5, Prix Light</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Filizola</h4>
                    <p className="text-sm text-muted-foreground">CS15, BP15, Platina</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Urano</h4>
                    <p className="text-sm text-muted-foreground">US 15/2, US 20/2, PopS</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Outras</h4>
                    <p className="text-sm text-muted-foreground">Qualquer balança com saída serial RS-232 ou USB-Serial</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="connection">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Usb className="h-4 w-4" />
                  Passo 1: Conexão Física
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Balança com porta USB:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Conecte o cabo USB da balança ao computador</li>
                    <li>Aguarde o Windows/Linux/Mac detectar o dispositivo</li>
                    <li>O driver geralmente é instalado automaticamente</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Balança com porta RS-232 (Serial DB9):</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Você precisará de um adaptador <strong>USB para Serial RS-232</strong></li>
                    <li>Conecte o cabo serial da balança ao adaptador</li>
                    <li>Conecte o adaptador USB ao computador</li>
                    <li>Instale o driver do adaptador se necessário (geralmente CH340 ou FTDI)</li>
                  </ol>
                </div>
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Para verificar se a balança foi reconhecida, abra o Gerenciador de Dispositivos (Windows) 
                    e procure por "Portas (COM & LPT)".
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="config">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Passo 2: Configuração da Balança
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Configure a balança para enviar dados automaticamente (modo contínuo) ou sob demanda:
                </p>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium">Configurações de Comunicação Padrão:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Baud Rate:</span>
                    <Badge variant="secondary">9600</Badge>
                    <span>Data Bits:</span>
                    <Badge variant="secondary">8</Badge>
                    <span>Stop Bits:</span>
                    <Badge variant="secondary">1</Badge>
                    <span>Paridade:</span>
                    <Badge variant="secondary">Nenhuma (None)</Badge>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Consulte o manual da sua balança para verificar as configurações corretas. 
                    Algumas balanças podem usar Baud Rate diferente (4800, 19200, etc).
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="use">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Passo 3: Uso no PDV
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>Acesse a tela do <strong>PDV (Ponto de Venda)</strong></li>
                  <li>Clique no ícone da balança na barra superior</li>
                  <li>Clique em <strong>"Conectar Balança"</strong></li>
                  <li>O navegador mostrará uma lista de portas seriais disponíveis</li>
                  <li>Selecione a porta correspondente à sua balança</li>
                  <li>O peso será exibido automaticamente na tela</li>
                </ol>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-medium mb-2">Dica:</h4>
                  <p className="text-sm text-muted-foreground">
                    O sistema detecta automaticamente quando o peso estabiliza (indicador "ST" ou ausência de "US") 
                    para maior precisão na pesagem.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Leitor de Código de Barras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Configuração do Leitor de Código de Barras
          </CardTitle>
          <CardDescription>
            Tutorial para instalação e uso de leitores de código de barras USB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4" variant="default">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Plug and Play</AlertTitle>
            <AlertDescription>
              A maioria dos leitores de código de barras USB funcionam como um teclado, 
              não necessitando de configuração especial no sistema.
            </AlertDescription>
          </Alert>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="types">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Tipos de Leitores Suportados
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Leitores USB (Modo Teclado)</h4>
                    <p className="text-sm text-muted-foreground">
                      Funciona imediatamente ao conectar. O código é "digitado" como se fosse um teclado.
                    </p>
                    <Badge className="mt-2" variant="default">Recomendado</Badge>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Leitores Wireless/Bluetooth</h4>
                    <p className="text-sm text-muted-foreground">
                      Pareie com o computador via Bluetooth. Funciona da mesma forma que USB.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Câmera do Dispositivo</h4>
                    <p className="text-sm text-muted-foreground">
                      Leitura via câmera do computador ou celular (requer permissão do navegador).
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Leitores Serial RS-232</h4>
                    <p className="text-sm text-muted-foreground">
                      Requer adaptador USB-Serial. Mais comum em equipamentos industriais.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="install">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Usb className="h-4 w-4" />
                  Passo 1: Instalação
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Leitor USB:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Conecte o leitor à porta USB do computador</li>
                    <li>Aguarde alguns segundos para o reconhecimento automático</li>
                    <li>Teste lendo qualquer código de barras com um editor de texto aberto</li>
                    <li>O código deve aparecer como texto digitado</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Leitor Bluetooth:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Ative o modo de pareamento no leitor (consulte o manual)</li>
                    <li>Vá em Configurações → Bluetooth no seu computador</li>
                    <li>Adicione um novo dispositivo e selecione o leitor</li>
                    <li>Após pareado, funciona como um leitor USB</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="config-scanner">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Passo 2: Configuração Recomendada
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Para melhor funcionamento com o sistema, configure seu leitor com:
                </p>
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Sufixo:</span>
                    <Badge variant="secondary">Enter (CR ou LF)</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Isso faz o sistema processar o código automaticamente após a leitura.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Prefixo:</span>
                    <Badge variant="secondary">Nenhum</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Modo:</span>
                    <Badge variant="secondary">Keyboard HID</Badge>
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    A maioria dos leitores já vem configurada com essas opções. 
                    Consulte o manual para escanear códigos de configuração se necessário.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="use-scanner">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Passo 3: Uso no Sistema
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">No PDV:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Certifique-se de que o campo de busca ou SKU está focado</li>
                    <li>Escaneie o código de barras do produto</li>
                    <li>O produto será adicionado automaticamente ao carrinho</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">No Estoque:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Acesse a página de Estoque</li>
                    <li>Escaneie o código para localizar o produto rapidamente</li>
                    <li>Atualize as quantidades conforme necessário</li>
                  </ol>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-medium mb-2">Atalho de Teclado:</h4>
                  <p className="text-sm text-muted-foreground">
                    No PDV, pressione <Badge variant="outline">F2</Badge> para focar rapidamente no campo de busca 
                    antes de escanear.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="camera">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Alternativa: Leitura por Câmera
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Se você não possui um leitor físico, pode usar a câmera do dispositivo:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>No PDV, clique no ícone de câmera/scanner</li>
                  <li>Permita o acesso à câmera quando solicitado pelo navegador</li>
                  <li>Posicione o código de barras em frente à câmera</li>
                  <li>O sistema detectará e processará automaticamente</li>
                </ol>
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    A leitura por câmera pode ser mais lenta que um leitor dedicado. 
                    Recomendamos um leitor USB para alto volume de vendas.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Solução de Problemas
          </CardTitle>
          <CardDescription>
            Problemas comuns e como resolvê-los
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="scale-not-found">
              <AccordionTrigger>Balança não aparece na lista de portas</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>Verifique se o cabo está bem conectado</li>
                  <li>Reinicie a balança</li>
                  <li>Verifique se o driver USB-Serial está instalado (para adaptadores)</li>
                  <li>Tente outra porta USB</li>
                  <li>Use o Gerenciador de Dispositivos para verificar se há erros</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="scale-no-data">
              <AccordionTrigger>Balança conectada mas não envia peso</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>Verifique as configurações de Baud Rate (padrão: 9600)</li>
                  <li>Configure a balança para modo contínuo ou sob demanda</li>
                  <li>Verifique se a balança está zerada (tara)</li>
                  <li>Consulte o manual para o protocolo de comunicação correto</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scanner-not-working">
              <AccordionTrigger>Leitor de código de barras não funciona</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>Verifique se o leitor emite bip ao escanear</li>
                  <li>Teste em um editor de texto para ver se o código aparece</li>
                  <li>Verifique se o sufixo Enter está configurado</li>
                  <li>Certifique-se de que o campo de texto está focado no sistema</li>
                  <li>Limpe a lente do leitor se estiver suja</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="browser-error">
              <AccordionTrigger>Erro: "Web Serial API não suportada"</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>Use Google Chrome, Microsoft Edge ou Opera (versão 89+)</li>
                  <li>Firefox e Safari não suportam Web Serial API</li>
                  <li>Certifique-se de que está acessando via HTTPS</li>
                  <li>Verifique se o navegador está atualizado</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
