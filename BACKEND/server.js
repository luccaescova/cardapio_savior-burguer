const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const DESTINATION_NUMBER = '5519999999999@c.us';
const AUTO_REMOVE_DELAY = 30000; // 30 segundos na tela de prontos

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
  console.log('✅ WhatsApp conectado!');
});

whatsappClient.on('disconnected', () => {
  whatsappClient.initialize();
});

whatsappClient.initialize();

let activeOrders = [];

function formatOrderMessage(orderData) {
  const { customerName, items, total } = orderData;
  const dateStr = new Date().toLocaleString('pt-BR');

  let message = `*🍔 SAVIOR BURGUER - NOVA COMANDA 🍔*\n`;
  message += `*Cliente:* ${customerName}\n`;
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

io.on('connection', (socket) => {
  socket.emit('orders_update', activeOrders);

  socket.on('update_order_status', ({ id, status }) => {
    const order = activeOrders.find(o => o.id === id);
    if (order) {
      order.status = status;
      io.emit('orders_update', activeOrders);
      
      if (status === 'pronto') {
        io.emit('announce_order', order);

        setTimeout(() => {
          activeOrders = activeOrders.filter(o => o.id !== id);
          io.emit('orders_update', activeOrders);
        }, AUTO_REMOVE_DELAY);
      }
    }
  });
});

app.post('/api/order', async (req, res) => {
  try {
    const { customerName, items, total } = req.body;

    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Dados do pedido inválidos' });
    }

    const newOrder = {
      id: Date.now().toString(), // ID interno apenas para controle do sistema
      customerName,
      items,
      total,
      status: 'preparando',
      createdAt: new Date()
    };

    activeOrders.push(newOrder);
    io.emit('orders_update', activeOrders);

    const messageText = formatOrderMessage(newOrder);
    await whatsappClient.sendMessage(DESTINATION_NUMBER, messageText);

    res.status(200).json({ success: true, customerName: newOrder.customerName });

  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    res.status(500).json({ error: 'Erro ao processar o envio do pedido' });
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});