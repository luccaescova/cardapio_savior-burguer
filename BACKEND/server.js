const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

// NÚMERO DE DESTINO (DDI + DDD + Número)
const DESTINATION_NUMBER = '5519999999999@c.us';

// Cliente do WhatsApp com argumentos do Puppeteer para evitar erros de conexão
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

whatsappClient.on('qr', (qr) => {
  console.log('\n--- ESCANEIE O QR CODE ABAIXO ---');
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
  console.log('✅ WhatsApp conectado e pronto para enviar comandas!');
});

whatsappClient.on('auth_failure', (msg) => {
  console.error('❌ Falha na autenticação do WhatsApp:', msg);
});

whatsappClient.on('disconnected', (reason) => {
  console.log('⚠️ WhatsApp desconectado:', reason);
  whatsappClient.initialize();
});

whatsappClient.initialize();

// Formatação da comanda para mensagem de texto no WhatsApp
function formatOrderMessage(orderData) {
  const { items, total } = orderData;
  const dateStr = new Date().toLocaleString('pt-BR');

  let message = `*🍔 SAVIOR BURGUER - NOVA COMANDA 🍔*\n`;
  message += `_Data: ${dateStr}_\n`;
  message += `------------------------------------\n\n`;

  items.forEach((item) => {
    message += `*${item.qty}x ${item.name}*\n`;

    if (item.removedList && item.removedList.length > 0) {
      message += `   ❌ *Sem:* ${item.removedList.join(', ')}\n`;
    }

    if (item.extras && item.extras.length > 0) {
      const extrasStr = item.extras.map(e => `+${e.name} (R$ ${e.price.toFixed(2).replace('.', ',')})`).join(', ');
      message += `   ➕ *Adicionais:* ${extrasStr}\n`;
    }

    const itemTotal = (item.unitPrice * item.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    message += `   💰 Subtotal: ${itemTotal}\n\n`;
  });

  message += `------------------------------------\n`;
  const totalStr = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  message += `*TOTAL DO PEDIDO: ${totalStr}*\n`;
  message += `------------------------------------`;

  return message;
}

// Rota POST do pedido
app.post('/api/order', async (req, res) => {
  try {
    const { items, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    const messageText = formatOrderMessage({ items, total });

    await whatsappClient.sendMessage(DESTINATION_NUMBER, messageText);

    console.log('Comanda enviada para o WhatsApp com sucesso!');
    res.status(200).json({ success: true, message: 'Pedido enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar mensagem pelo WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao processar o envio do pedido' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});