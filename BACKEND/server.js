const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const pdfToPrinter = require('pdf-to-printer');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, '..', 'FRONTEND');
app.use(express.static(frontendPath));

const CONFIG_FILE = path.join(__dirname, 'printer-config.json');

// --- ESTADO GLOBAL ---
let activeOrders = [];
let whatsappStatus = 'DISCONNECTED';
let latestQrImage = null;
let lastQrEmitTime = 0; // Controle de intervalo para evitar atualizações muito rápidas

// --- TRATAMENTO GLOBAL DE ERROS ---
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

// --- CONFIGURAÇÃO CLIENTE WHATSAPP ---
let whatsappClient = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    bypassCSP: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-software-rasterizer',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--allow-insecure-localhost'
    ]
  }
});

function setupWhatsappEvents(client) {
  client.on('qr', async (qr) => {
    try {
      const now = Date.now();
      // Intervalo de segurança (ex: 45 segundos) para evitar spam de refresh do QR Code na tela
      const QR_COOLDOWN = 45000; 

      if (latestQrImage && (now - lastQrEmitTime < QR_COOLDOWN)) {
        return; // Ignora se o QR Code atual foi gerado há poucos segundos
      }

      lastQrEmitTime = now;
      latestQrImage = await qrcode.toDataURL(qr);
      whatsappStatus = 'QR_READY';
      io.emit('whatsapp_qr', latestQrImage);
      io.emit('whatsapp_status', { status: whatsappStatus });
      console.log('📲 Novo QR Code gerado para o WhatsApp (estabilizado).');
    } catch (err) {
      console.error('Erro ao converter QR Code:', err);
    }
  });

  client.on('ready', () => {
    whatsappStatus = 'CONNECTED';
    latestQrImage = null;
    io.emit('whatsapp_status', { status: whatsappStatus });
    console.log(`✅ WhatsApp conectado com sucesso! Número logado: ${client.info?.wid?.user || 'Desconhecido'}`);
  });

  client.on('auth_failure', (msg) => {
    whatsappStatus = 'DISCONNECTED';
    latestQrImage = null;
    io.emit('whatsapp_status', { status: whatsappStatus, error: msg });
    console.error('❌ Falha na autenticação do WhatsApp:', msg);
  });

  client.on('disconnected', (reason) => {
    whatsappStatus = 'DISCONNECTED';
    latestQrImage = null;
    io.emit('whatsapp_status', { status: whatsappStatus, reason });
    console.log('⚠️ WhatsApp desconectado. Motivo:', reason);
  });
}

setupWhatsappEvents(whatsappClient);

try {
  whatsappClient.initialize();
} catch (err) {
  console.error('Erro ao inicializar WhatsApp Client:', err);
}

// --- FUNÇÕES AUXILIARES ---
function getSavedPrinter() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return config.printerName || '';
    }
  } catch (err) {
    console.error('Erro ao ler impressora:', err);
  }
  return '';
}

function savePrinterConfig(printerName) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ printerName }), 'utf8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar impressora:', err);
    return false;
  }
}

function formatWhatsAppOrder(orderData) {
  const { items, total, orderId, customerName } = orderData;
  const dateStr = new Date().toLocaleString('pt-BR');

  let message = `*🍔 SAVIOR BURGUER - NOVO PEDIDO #${orderId} 🍔*\n`;
  message += `_Cliente: ${customerName}_\n`;
  message += `_Data: ${dateStr}_\n`;
  message += `------------------------------------\n\n`;

  if (Array.isArray(items)) {
    items.forEach((item) => {
      const qty = item.quantity || item.qty || 1;
      const price = item.price || item.unitPrice || 0;
      message += `*${qty}x ${item.name}*\n`;

      const removed = item.removed || item.removedList || item.removableIngredients;
      if (removed && removed.length > 0) {
        message += `   ❌ *Sem:* ${removed.join(', ')}\n`;
      }

      if (item.swapMeat) {
        message += `   🥩 *Troca por carne (+R$ 10,00)*\n`;
      }

      if (item.extras && item.extras.length > 0) {
        message += `   ➕ *Adicionais:* ${item.extras.join(', ')}\n`;
      }

      const itemTotal = (price * qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      message += `   💰 Subtotal: ${itemTotal}\n\n`;
    });
  }

  message += `------------------------------------\n`;
  const totalStr = Number(total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  message += `*TOTAL DO PEDIDO: ${totalStr}*\n`;
  message += `------------------------------------`;

  return message;
}

async function createReceiptPdf(orderData, filePath) {
  const pdfDoc = await PDFDocument.create();
  const width = 164;

  let itemLines = 0;
  if (Array.isArray(orderData.items)) {
    orderData.items.forEach(item => {
      itemLines += 1;
      if (item.flavor) itemLines += 1;
      if ((item.removableIngredients && item.removableIngredients.length) || (item.removed && item.removed.length)) itemLines += 1;
      if (item.swapMeat) itemLines += 1;
      if (item.extras && item.extras.length) itemLines += 1;
    });
  }
  const height = Math.max(260, (14 + itemLines) * 16 + 60);

  const page = pdfDoc.addPage([width, height]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - 20;

  function writeLine(text, font = fontRegular, size = 8, align = 'left') {
    const textWidth = font.widthOfTextAtSize(text, size);
    let x = 8;
    if (align === 'center') x = (width - textWidth) / 2;
    if (align === 'right') x = width - textWidth - 8;
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 4;
  }

  
  writeLine("SAVIOR BURGUER", fontBold, 12, 'center');
  writeLine("----------------------------------------", fontRegular, 7, 'center');
  writeLine(`PEDIDO #${orderData.orderId}`, fontBold, 10, 'left');
  writeLine(`DATA: ${new Date().toLocaleString('pt-BR')}`, fontRegular, 7, 'left');
  writeLine(`CLIENTE: ${orderData.customerName.toUpperCase()}`, fontRegular, 8, 'left');
  writeLine("----------------------------------------", fontRegular, 7, 'center');

  writeLine("ITENS DO PEDIDO:", fontBold, 8, 'left');

  if (Array.isArray(orderData.items)) {
    orderData.items.forEach(item => {
      const qty = item.quantity || item.qty || 1;
      const price = item.price || item.unitPrice || 0;
      const itemTotal = (price * qty).toFixed(2);
      writeLine(`${qty}x ${item.name.toUpperCase()} - R$ ${itemTotal}`, fontBold, 8, 'left');

      if (item.flavor) writeLine(`   SABOR: ${item.flavor.toUpperCase()}`, fontRegular, 7, 'left');
      const removedList = item.removed || item.removableIngredients || item.removedList;
      if (removedList && removedList.length > 0) writeLine(`   SEM: ${removedList.join(', ').toUpperCase()}`, fontRegular, 7, 'left');
      if (item.swapMeat) writeLine("   * TROCAR POR CARNE (+R$10)", fontRegular, 7, 'left');
      if (item.extras && item.extras.length > 0) writeLine(`   ADD: ${item.extras.join(', ').toUpperCase()}`, fontRegular, 7, 'left');
    });
  }

  writeLine("----------------------------------------", fontRegular, 7, 'center');
  writeLine(`TOTAL: R$ ${Number(orderData.total || 0).toFixed(2)}`, fontBold, 11, 'right');
  writeLine("----------------------------------------", fontRegular, 7, 'center');

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

// --- WEBSOCKET CONNECTION ---
io.on('connection', (socket) => {
  socket.emit('orders_update', activeOrders);
  socket.emit('whatsapp_status', { status: whatsappStatus });
  if (whatsappStatus === 'QR_READY' && latestQrImage) {
    socket.emit('whatsapp_qr', latestQrImage);
  }
});

// --- ROTAS DA API ---
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: whatsappStatus, qrCode: latestQrImage });
});

// --- ROTA PARA DESCONECTAR O WHATSAPP ---
app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    whatsappStatus = 'DISCONNECTED';
    latestQrImage = null;
    lastQrEmitTime = 0;
    io.emit('whatsapp_status', { status: whatsappStatus });

    if (whatsappClient) {
      try {
        await whatsappClient.logout();
      } catch (e) {}
      try {
        await whatsappClient.destroy();
      } catch (e) {}
    }

    const authPath = path.join(__dirname, '.wwebjs_auth');
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }

    console.log('🔌 WhatsApp desconectado e sessão limpa.');

    setTimeout(() => {
      whatsappStatus = 'INITIALIZING';
      lastQrEmitTime = 0;
      io.emit('whatsapp_status', { status: whatsappStatus });
      
      whatsappClient = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        puppeteer: {
          headless: true,
          bypassCSP: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--allow-insecure-localhost'
          ]
        }
      });
      setupWhatsappEvents(whatsappClient);
      whatsappClient.initialize();
    }, 2000);

    return res.json({ success: true, message: 'WhatsApp desconectado com sucesso.' });
  } catch (err) {
    console.error('❌ Erro ao desconectar WhatsApp:', err);
    return res.status(500).json({ success: false, error: 'Erro ao desconectar WhatsApp.' });
  }
});

app.post('/api/print-order', async (req, res) => {
  const { customerName, items, total, orderId } = req.body;
  const activePrinterName = getSavedPrinter();

  const newOrder = {
    orderId: orderId || Math.floor(1000 + Math.random() * 9000),
    customerName: customerName || 'Balcão',
    items: items || [],
    total: total || 0,
    status: 'preparando'
  };

  activeOrders.push(newOrder);
  io.emit('orders_update', activeOrders);

  // ENVIAR PARA O PRÓPRIO WHATSAPP CONECTADO
  if (whatsappStatus === 'CONNECTED' && whatsappClient.info?.wid?._serialized) {
    try {
      const myNumberId = whatsappClient.info.wid._serialized;
      const messageText = formatWhatsAppOrder(newOrder);
      
      await whatsappClient.sendMessage(myNumberId, messageText);
      console.log(`📱 Pedido #${newOrder.orderId} enviado com SUCESSO para o próprio número (${myNumberId})!`);
    } catch (wsErr) {
      console.error('❌ Erro ao enviar mensagem no WhatsApp:', wsErr.message || wsErr);
    }
  } else {
    console.log('⚠️ WhatsApp desconectado. Conecte no painel /admin para receber as comandas.');
  }

  // Impressão Térmica (Segura para funcionar mesmo sem impressora conectada)
  if (activePrinterName) {
    const tempPdfPath = path.join(__dirname, `temp_receipt_${Date.now()}.pdf`);
    try {
      await createReceiptPdf(newOrder, tempPdfPath);
      await pdfToPrinter.print(tempPdfPath, { printer: activePrinterName });
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    } catch (error) {
      console.warn('⚠️ Aviso: Impressão térmica ignorada (impressora desconectada ou desligada). O pedido prosseguiu normalmente.');
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    }
  }

  return res.json({ success: true, orderData: newOrder });
});

app.get('/api/admin/printers', async (req, res) => {
  try {
    const printers = await pdfToPrinter.getPrinters();
    return res.json({ success: true, printers: printers || [], selectedPrinter: getSavedPrinter() });
  } catch (err) {
    console.warn('⚠️ Nenhuma impressora USB detectada ou erro ao listar:', err.message);
    return res.json({ success: true, printers: [], selectedPrinter: getSavedPrinter() });
  }
});

app.post('/api/admin/select-printer', (req, res) => {
  const { printerName } = req.body;
  if (!printerName) return res.status(400).json({ success: false, error: 'Nome da impressora inválido.' });

  const success = savePrinterConfig(printerName);
  if (success) return res.json({ success: true, message: `Impressora "${printerName}" salva!` });
  return res.status(500).json({ success: false, error: 'Erro ao salvar impressora.' });
});

app.post('/api/call-order', (req, res) => {
  const { customerName, orderId, action } = req.body;
  let order = activeOrders.find(o => o.orderId == orderId || o.customerName === customerName);

  if (action === 'ready' || action === 'announce') {
    if (order) order.status = 'pronto';
    else {
      order = { orderId: orderId || Date.now(), customerName, status: 'pronto' };
      activeOrders.push(order);
    }
    io.emit('announce_order', order);
    io.emit('orders_update', activeOrders);
    return res.json({ success: true, message: 'Anunciado na TV!' });
  }

  if (action === 'deliver') {
    activeOrders = activeOrders.filter(o => o !== order);
    io.emit('orders_update', activeOrders);
    return res.json({ success: true, message: 'Pedido entregue!' });
  }

  return res.status(400).json({ success: false, error: 'Ação inválida' });
});

app.get(['/admin', '/admin.html'], (req, res) => res.sendFile(path.join(frontendPath, 'admin.html')));
app.get('/tv.html', (req, res) => res.sendFile(path.join(frontendPath, 'tv.html')));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Savior Burguer ativo em http://localhost:${PORT}`);
});