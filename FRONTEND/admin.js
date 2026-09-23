const socket = io();

document.addEventListener('DOMContentLoaded', () => {
  loadAvailablePrinters();

  document.getElementById('btnSavePrinter')?.addEventListener('click', saveSelectedPrinter);

  // --- WEBSOCKET LISTENERS ---
  socket.on('orders_update', (orders) => {
    renderKitchenOrders(orders);
  });

  socket.on('whatsapp_status', (data) => {
    updateWhatsAppStatus(data.status, data.error || data.reason);
  });

  socket.on('whatsapp_qr', (qrDataUrl) => {
    showQrCode(qrDataUrl);
  });
});

// --- GERENCIAMENTO DE WHATSAPP ---
function updateWhatsAppStatus(status, errorDetails = '') {
  const msgContainer = document.getElementById('waStatusMsg');
  const qrContainer = document.getElementById('qrContainer');

  if (!msgContainer) return;

  if (status === 'CONNECTED') {
    msgContainer.innerHTML = '<span style="color: #4cd137;">✅ WhatsApp Conectado e Pronto!</span>';
    if (qrContainer) qrContainer.style.display = 'none';
  } else if (status === 'QR_READY') {
    msgContainer.innerHTML = '<span style="color: #00f5d4;">📲 Aguardando leitura do QR Code...</span>';
  } else if (status === 'INITIALIZING') {
    msgContainer.innerHTML = '<div class="spinner"></div> <span style="color: #ffb703;">Inicializando navegador e gerando QR Code...</span>';
    if (qrContainer) qrContainer.style.display = 'none';
  } else {
    // DISCONNECTED ou Erro
    let errText = errorDetails ? `<br><small style="color:#aaa; font-weight:normal;">Motivo: ${errorDetails}</small>` : '';
    msgContainer.innerHTML = `<span style="color: #ff4757;">⚠️ WhatsApp Desconectado. ${errText}</span>`;
    if (qrContainer) qrContainer.style.display = 'none';
  }
}

function showQrCode(qrDataUrl) {
  const qrContainer = document.getElementById('qrContainer');
  const qrImage = document.getElementById('qrImage');

  if (qrImage && qrContainer) {
    qrImage.src = qrDataUrl;
    qrContainer.style.display = 'block';
  }
}

// --- IMPRESSORA ---
async function loadAvailablePrinters() {
  const select = document.getElementById('printerSelect');
  const status = document.getElementById('printerStatus');

  try {
    const res = await fetch('/api/admin/printers');
    const data = await res.json();

    if (data.success) {
      select.innerHTML = '<option value="">-- Selecione uma impressora --</option>';
      data.printers.forEach(printer => {
        const option = document.createElement('option');
        option.value = printer.name;
        option.textContent = printer.name;
        if (printer.name === data.selectedPrinter) option.selected = true;
        select.appendChild(option);
      });

      if (data.selectedPrinter) {
        status.innerHTML = `<span style="color: #4cd137;">Impressora Ativa: "${data.selectedPrinter}"</span>`;
      } else {
        status.innerHTML = `<span style="color: #eccc68;">Nenhuma impressora selecionada.</span>`;
      }
    } else {
      status.innerHTML = `<span style="color: #ff4757;">${data.error}</span>`;
    }
  } catch (err) {
    if (select) select.innerHTML = '<option value="">Servidor indisponível</option>';
    if (status) status.innerHTML = `<span style="color: #ff4757;">⚠️ Acesse via <a href="http://localhost:3000/admin" style="color:#00f5d4">http://localhost:3000/admin</a></span>`;
  }
}

async function saveSelectedPrinter() {
  const select = document.getElementById('printerSelect');
  const status = document.getElementById('printerStatus');
  const selectedName = select.value;

  if (!selectedName) {
    alert('Selecione uma impressora da lista!');
    return;
  }

  try {
    const res = await fetch('/api/admin/select-printer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: selectedName })
    });
    const data = await res.json();
    if (data.success) {
      status.innerHTML = `<span style="color: #4cd137;">✅ ${data.message}</span>`;
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Erro ao comunicar com o servidor.');
  }
}

// --- PEDIDOS E COZINHA ---
function renderKitchenOrders(orders) {
  const container = document.getElementById('ordersGrid');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; color: #aaa; text-align: center;">Nenhum pedido em andamento.</p>';
    return;
  }

  container.innerHTML = orders.map(order => {
    const isReady = order.status === 'pronto';
    let itemsHtml = '';

    if (Array.isArray(order.items)) {
      itemsHtml = order.items.map(i => {
        const qty = i.qty || i.quantity || 1;
        const removed = i.removedList || i.removableIngredients || i.removed;
        return `
          <div class="item-row" style="margin-bottom:6px;">
            <strong>${qty}x ${i.name}</strong>
            ${removed && removed.length ? `<br><small style="color:#ff6b6b">Sem: ${removed.join(', ')}</small>` : ''}
            ${i.swapMeat ? `<br><small style="color:#ff8c00">Com Carne (+R$10)</small>` : ''}
            ${i.extras && i.extras.length ? `<br><small style="color:#4cd137">Add: ${i.extras.join(', ')}</small>` : ''}
          </div>
        `;
      }).join('');
    }

    return `
      <div class="order-card ${isReady ? 'ready' : ''}">
        <div class="order-header">
          <span class="order-title">#${order.orderId} - ${order.customerName}</span>
          <span class="status-badge ${isReady ? 'badge-pronto' : 'badge-preparando'}">${order.status}</span>
        </div>
        <div class="items-list">${itemsHtml || '<em>Sem detalhes</em>'}</div>
        <div class="btn-group">
          <button class="btn-action btn-call" onclick="callOrder('${order.orderId}', '${order.customerName}')">
            📢 ${isReady ? 'Rechamar TV' : 'Chamar na TV'}
          </button>
          <button class="btn-action btn-deliver" onclick="deliverOrder('${order.orderId}', '${order.customerName}')">
            ✔️ Entregar
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function callOrder(orderId, customerName) {
  await fetch('/api/call-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, customerName, action: 'ready' })
  });
}

async function deliverOrder(orderId, customerName) {
  await fetch('/api/call-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, customerName, action: 'deliver' })
  });
}