const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const User = require('./models/User');
const Product = require('./models/Product');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'sua_chave_secreta_super_segura';
const MONGO_URI = 'mongodb://127.0.0.1:27017/savior_burguer';

mongoose.connect(MONGO_URI, { family: 4 })
  .then(() => console.log('✅ Conectado ao MongoDB!'))
  .catch(err => console.error('❌ Erro no MongoDB:', err));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const DESTINATION_NUMBER = '5519999999999@c.us';
const AUTO_REMOVE_DELAY = 30000;

let whatsappClient = null;
let activeOrders = [];
let whatsappStatus = 'DISCONNECTED';

// Middlewares
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso restrito para Administradores' });
  }
}

// Rotas de Autenticação
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role: role || 'user' });
    await user.save();

    res.status(201).json({ success: true, message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, name: user.name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// Rotas de Produtos
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, price, description, category, image } = req.body;
    const newProduct = new Product({ name, price, description, category, image });
    await newProduct.save();

    io.emit('products_updated');
    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Rota de Pedidos
app.post('/api/order', authenticateToken, async (req, res) => {
  try {
    const { items, total } = req.body;
    const customerName = req.user.name;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    const newOrder = {
      id: Date.now().toString(),
      customerName,
      items,
      total,
      status: 'preparando',
      createdAt: new Date()
    };

    activeOrders.push(newOrder);
    io.emit('orders_update', activeOrders);

    if (whatsappClient && whatsappStatus === 'READY') {
      const messageText = formatOrderMessage(newOrder);
      await whatsappClient.sendMessage(DESTINATION_NUMBER, messageText);
    }

    res.status(200).json({ success: true, customerName });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar o envio do pedido' });
  }
});

// WhatsApp & Socket.io
function createWhatsAppClient() {
  if (whatsappClient) return;
  whatsappStatus = 'CONNECTING';
  io.emit('whatsapp_status', { status: whatsappStatus });

  whatsappClient = new Client({
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

  whatsappClient.on('qr', async (qr) => {
    try {
      const qrImageData = await QRCode.toDataURL(qr);
      io.emit('whatsapp_qr', { qr: qrImageData });
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
    }
  });

  whatsappClient.on('ready', () => {
    whatsappStatus = 'READY';
    io.emit('whatsapp_status', { status: whatsappStatus });
  });

  whatsappClient.on('disconnected', () => {
    whatsappStatus = 'DISCONNECTED';
    whatsappClient.destroy();
    whatsappClient = null;
    io.emit('whatsapp_status', { status: whatsappStatus });
  });

  whatsappClient.initialize();
}

function formatOrderMessage(orderData) {
  const { customerName, items, total } = orderData;
  let message = `*🍔 SAVIOR BURGUER - NOVA COMANDA 🍔*\n*Cliente:* ${customerName}\n\n`;
  items.forEach(item => {
    message += `*${item.qty}x ${item.name}*\n`;
    if (item.removedList?.length) message += `   ❌ Sem: ${item.removedList.join(', ')}\n`;
    if (item.extras?.length) message += `   ➕ Adicionais: ${item.extras.map(e => e.name).join(', ')}\n`;
  });
  message += `\n*TOTAL: R$ ${total.toFixed(2)}*`;
  return message;
}

io.on('connection', (socket) => {
  socket.emit('orders_update', activeOrders);
  socket.emit('whatsapp_status', { status: whatsappStatus });

  socket.on('start_whatsapp', () => {
    if (whatsappStatus === 'DISCONNECTED') createWhatsAppClient();
  });

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

const PORT = 3000;
server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));