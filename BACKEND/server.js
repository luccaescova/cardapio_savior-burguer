const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const pdfToPrinter = require('pdf-to-printer');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, '..', 'FRONTEND');
app.use(express.static(frontendPath));

const CONFIG_FILE = path.join(__dirname, 'printer-config.json');
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// --- HELPER FUNCTIONS ---

function getSavedPrinter() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return config.printerName || '';
    }
  } catch (err) {
    console.error('Erro ao ler configuração de impressora:', err);
  }
  return '';
}

function savePrinterConfig(printerName) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ printerName }), 'utf8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar configuração de impressora:', err);
    return false;
  }
}

function getProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Erro ao ler produtos:', err);
  }
  return [];
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar produtos:', err);
    return false;
  }
}

// --- SOCKET.IO ---

io.on('connection', (socket) => {
  console.log('⚡ Cliente conectado via Socket.io:', socket.id);
});

// --- ROTAS PRODUTOS & IMPRESSORAS ---

app.get('/api/products', (req, res) => res.json({ success: true, products: getProducts() }));

app.post('/api/admin/products', (req, res) => {
  const { name, category, price, description, image } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ success: false, error: 'Nome, categoria e preço são obrigatórios.' });
  }

  const products = getProducts();
  const newProduct = { id: Date.now().toString(), name, category, price: parseFloat(price), description: description || '', image: image || '' };
  products.push(newProduct);

  if (saveProducts(products)) {
    io.emit('menu-updated', products);
    return res.json({ success: true, message: 'Produto cadastrado com sucesso!', product: newProduct });
  }
  return res.status(500).json({ success: false, error: 'Erro ao salvar produto.' });
});

app.delete('/api/admin/products/:id', (req, res) => {
  let products = getProducts();
  const initialLength = products.length;
  products = products.filter(p => p.id !== req.params.id);

  if (products.length === initialLength) return res.status(404).json({ success: false, error: 'Produto não encontrado.' });

  if (saveProducts(products)) {
    io.emit('menu-updated', products);
    return res.json({ success: true, message: 'Produto removido com sucesso!' });
  }
  return res.status(500).json({ success: false, error: 'Erro ao excluir produto.' });
});

app.get('/api/admin/printers', async (req, res) => {
  try {
    const printers = await pdfToPrinter.getPrinters();
    return res.json({ success: true, printers, selectedPrinter: getSavedPrinter() });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Erro ao listar impressoras.' });
  }
});

app.post('/api/admin/select-printer', (req, res) => {
  const { printerName } = req.body;
  if (!printerName) return res.status(400).json({ success: false, error: 'Nome da impressora obrigatório.' });

  if (savePrinterConfig(printerName)) {
    return res.json({ success: true, message: `Impressora "${printerName}" salva com sucesso!` });
  }
  return res.status(500).json({ success: false, error: 'Erro ao salvar configuração.' });
});

// --- FUNÇÃO PARA GERAR PDF DA COMANDA ---

async function createReceiptPdf(orderData, filePath) {
  const pdfDoc = await PDFDocument.create();
  
  // Largura padrão para papel térmico de 58mm (~164pt)
  const width = 164;
  
  // Calcular a altura dinâmica com base nos itens
  const baseLines = 12;
  let itemLines = 0;
  if (Array.isArray(orderData.items)) {
    orderData.items.forEach(item => {
      itemLines += 1;
      if (item.removed && item.removed.length) itemLines += 1;
      if (item.swapMeat) itemLines += 1;
      if (item.extras && item.extras.length) itemLines += 1;
    });
  }
  const height = Math.max(250, (baseLines + itemLines) * 16 + 80);

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

  // Cabeçalho
  writeLine("SAVIOR BURGUER", fontBold, 12, 'center');
  writeLine("----------------------------------------", fontRegular, 7, 'center');
  writeLine(`PEDIDO #${orderData.orderId}`, fontBold, 10, 'left');
  writeLine(`DATA: ${new Date().toLocaleString('pt-BR')}`, fontRegular, 7, 'left');
  writeLine(`CLIENTE: ${orderData.customerName.toUpperCase()}`, fontRegular, 8, 'left');
  writeLine("----------------------------------------", fontRegular, 7, 'center');

  // Itens
  writeLine("ITENS DO PEDIDO:", fontBold, 8, 'left');

  if (Array.isArray(orderData.items)) {
    orderData.items.forEach(item => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      writeLine(`${item.quantity}x ${item.name.toUpperCase()} - R$ ${itemTotal}`, fontBold, 8, 'left');

      if (item.removed && item.removed.length > 0) {
        writeLine(`   SEM: ${item.removed.join(', ')}`, fontRegular, 7, 'left');
      }
      if (item.swapMeat) {
        writeLine("   * TROCAR FRANGO POR CARNE", fontRegular, 7, 'left');
      }
      if (item.extras && item.extras.length > 0) {
        writeLine(`   ADD: ${item.extras.join(', ')}`, fontRegular, 7, 'left');
      }
    });
  }

  writeLine("----------------------------------------", fontRegular, 7, 'center');
  writeLine(`TOTAL: R$ ${Number(orderData.total || 0).toFixed(2)}`, fontBold, 11, 'right');
  writeLine("----------------------------------------", fontRegular, 7, 'center');
  writeLine("Obrigado pela preferencia!", fontRegular, 8, 'center');

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

// --- ROTA DE IMPRESSÃO VIA PDF ---

app.post('/api/print-order', async (req, res) => {
  const { customerName, items, total, orderId } = req.body;
  const activePrinterName = getSavedPrinter();

  const orderData = {
    orderId: orderId || Math.floor(1000 + Math.random() * 9000),
    customerName: customerName || 'Balcão',
    items: items || [],
    total: total || 0,
    createdAt: new Date().toISOString()
  };

  io.emit('new-order', orderData);
  console.log(`📢 Novo pedido #${orderData.orderId} anunciado para a cozinha!`);

  if (!activePrinterName) {
    return res.status(400).json({
      success: false,
      error: 'Pedido anunciado, mas NENHUMA impressora foi configurada no Admin!'
    });
  }

  const tempPdfPath = path.join(__dirname, `temp_receipt_${Date.now()}.pdf`);

  try {
    // 1. Gera o PDF temporário da comanda
    await createReceiptPdf(orderData, tempPdfPath);

    // 2. Envia para a impressora via pdf-to-printer (spooler nativo do Windows)
    await pdfToPrinter.print(tempPdfPath, {
      printer: activePrinterName
    });

    console.log(`✅ Pedido #${orderData.orderId} enviado para a impressora "${activePrinterName}" (via PDF)`);

    // Limpar o ficheiro PDF temporário após envio
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

    return res.json({ success: true, message: 'Pedido anunciado e impresso com sucesso!' });

  } catch (error) {
    console.error('❌ Erro ao imprimir comanda em PDF:', error);
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

    return res.status(500).json({
      success: false,
      error: `Erro ao enviar comanda para a impressora "${activePrinterName}".`
    });
  }
});

// --- SERVIR FRONTEND ---

app.get('/admin.html', (req, res) => res.sendFile(path.join(frontendPath, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Servidor Savior Burguer Ativo!`);
  console.log(`📍 Cardápio: http://localhost:${PORT}`);
  console.log(`⚙️ Painel Admin: http://localhost:${PORT}/admin.html`);
  console.log(`==================================================\n`);
});