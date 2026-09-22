const express = require('express');
const cors = require('cors');
const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

const app = express();
app.use(cors());
app.use(express.json());

// ATENÇÃO: Substitua pelo nome EXATO da sua impressora no Painel de Controlo do Windows
// Exemplo: 'POS-58', 'TM-T20', 'Generic / Text Only'
const PRINTER_NAME = 'POS-58'; 

app.post('/api/print-order', async (req, res) => {
  const { customerName, items, total, orderId } = req.body;

  try {
    let printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Compatível com 95% das impressoras térmicas ESC/POS
      interface: `printer:${PRINTER_NAME}`,
      characterSet: CharacterSet.PC860_PORTUGUESE, // Suporte para acentos em português
      removeSpecialCharacters: false
    });

    // Cabeçalho da Comanda
    printer.alignCenter();
    printer.bold(true);
    printer.setTextQuadArea(); // Texto grande
    printer.println("SAVIOR BURGUER");
    printer.setTextNormal();
    printer.bold(false);
    printer.println("--------------------------------");

    // Dados do Pedido
    printer.alignLeft();
    printer.println(`PEDIDO #${orderId || Math.floor(1000 + Math.random() * 9000)}`);
    printer.println(`DATA: ${new Date().toLocaleString('pt-BR')}`);
    printer.println(`CLIENTE: ${customerName.toUpperCase()}`);
    printer.println("--------------------------------");

    // Itens do Pedido
    printer.bold(true);
    printer.println("ITENS DO PEDIDO:");
    printer.bold(false);

    items.forEach((item) => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      printer.println(`${item.quantity}x ${item.name.toUpperCase()} - R$ ${itemTotal}`);

      // Retiradas de ingredientes
      if (item.removed && item.removed.length > 0) {
        printer.println(`   SEM: ${item.removed.join(', ')}`);
      }

      // Troca de carne (Supreme)
      if (item.swapMeat) {
        printer.println("   * TROCAR FRANGO POR CARNE (+R$10)");
      }

      // Adicionais
      if (item.extras && item.extras.length > 0) {
        printer.println(`   ADD: ${item.extras.join(', ')}`);
      }
    });

    // Rodapé e Total
    printer.println("--------------------------------");
    printer.alignRight();
    printer.bold(true);
    printer.setTextDoubleHeight();
    printer.println(`TOTAL: R$ ${Number(total).toFixed(2)}`);
    printer.setTextNormal();
    printer.bold(false);

    printer.alignCenter();
    printer.println("--------------------------------");
    printer.println("Obrigado pela preferencia!");
    printer.println("\n\n");
    printer.cut();

    // Executa a impressão
    await printer.execute();
    console.log(`✅ Pedido #${orderId} impresso com sucesso na impressora "${PRINTER_NAME}"!`);
    return res.json({ success: true, message: 'Comanda impressa com sucesso!' });

  } catch (error) {
    console.error('❌ Erro ao enviar para a impressora:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Falha na impressão. Verifique se o nome da impressora está correto e se ela está ligada.' 
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🖨️  Servidor de Impressão Savior Burguer rodando em http://localhost:${PORT}`);
});