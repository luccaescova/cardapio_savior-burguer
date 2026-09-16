// Adicionais pagos globais
const AVAILABLE_EXTRAS = [
  { name: 'Bacon', price: 4.00 },
  { name: 'Alface', price: 2.00 },
  { name: 'Tomate', price: 2.00 },
  { name: 'Hambúrguer 210g', price: 15.00 },
  { name: 'Catupiry', price: 4.00 }
];

// Ingredientes removíveis específicos de cada lanche
const BURGER_INGREDIENTS = {
  'Texas': ['Maionese', 'Cebola Roxa', 'Alface', 'Rúcula', 'Queijo Cheddar', 'Queijo Mussarela', 'Queijo Canastra', 'Bacon', 'Molho Barbecue'],
  'Classic': ['Maionese', 'Cebola Roxa', 'Alface Americana', 'Queijo Cheddar', 'Bacon'],
  'Vegano': ['Maionese', 'Cebola Roxa', 'Alface Americana', 'Tomate'],
  'Ruby': ['Maionese', 'Queijo Cheddar'],
  'Caribe': ['Maionese', 'Queijo Canastra', 'Cebola Caramelizada', 'Bacon'],
  'Verona': ['Maionese', 'Cebola Roxa', 'Rúcula', 'Queijo Brie', 'Bacon', 'Mel'],
  'Supreme': ['Maionese', 'Cebola Roxa', 'Alface', 'Tomate', 'Catupiry', 'Cebola Crispy'],
  'Viena': ['Maionese', 'Cebola Roxa', 'Rúcula', 'Tomate', 'Picles', 'Bacon'],
  'Gold': ['Maionese', 'Cebola Roxa', 'Alface Americana', 'Queijo Cheddar', 'Bacon']
};

// Sabores disponíveis para as bebidas
const DRINK_OPTIONS = {
  'Refrigerante lata': ['Coca-Cola Normal', 'Coca-Cola Zero', 'Guaraná Normal', 'Guaraná Zero'],
  'Suco lata': ['Uva', 'Laranja']
};

const SWAP_MEAT_PRICE = 10.00;

const cart = [];
let selectedProduct = null;

// Elementos DOM - Modal de Quantidade / Personalização
const qtyModal = document.getElementById('quantityModal');
const modalProductName = document.getElementById('modalProductName');
const productQtyInput = document.getElementById('productQty');
const extrasSection = document.getElementById('extrasSection');
const extrasContainer = document.getElementById('extrasContainer');
const removeIngredientsSection = document.getElementById('removeIngredientsSection');
const removeIngredientsContainer = document.getElementById('removeIngredientsContainer');
const meatOptionSection = document.getElementById('meatOptionSection');
const swapMeatCheckbox = document.getElementById('swapMeatCheckbox');
const btnConfirmQty = document.getElementById('btnConfirmQty');
const btnCancelQty = document.getElementById('btnCancelQty');
const btnPlus = document.getElementById('btnPlus');
const btnMinus = document.getElementById('btnMinus');

// Elementos DOM - Carrinho
const cartFloatingBtn = document.getElementById('cartFloatingBtn');
const cartModal = document.getElementById('cartModal');
const closeCartModalBtn = document.getElementById('closeCartModal');
const cartCountElement = document.getElementById('cartCount');
const orderItems = document.getElementById('orderItems');
const totalElement = document.getElementById('total');
const cartEmptyElement = document.getElementById('cartEmpty');
const btnCheckout = document.getElementById('btnCheckout');
const customerNameInput = document.getElementById('customerNameInput');

// Elementos DOM - Modal de Sucesso
const orderSuccessModal = document.getElementById('orderSuccessModal');
const orderSuccessDetails = document.getElementById('orderSuccessDetails');
const btnCloseSuccessModal = document.getElementById('btnCloseSuccessModal');

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Reseta o carrinho e limpa o nome do cliente
function resetCart() {
  cart.length = 0;
  if (customerNameInput) customerNameInput.value = '';
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderRemoveIngredientsOptions(productName) {
  removeIngredientsContainer.innerHTML = '';
  const ingredients = BURGER_INGREDIENTS[productName] || [];

  if (ingredients.length === 0) {
    removeIngredientsSection.style.display = 'none';
    return;
  }

  const h4 = removeIngredientsSection.querySelector('h4');
  if (h4) h4.textContent = 'Retirar ingredientes?';

  ingredients.forEach((ingredient) => {
    const label = document.createElement('label');
    label.className = 'extra-option';
    label.innerHTML = `
      <span>
        <input type="checkbox" class="remove-ingredient-check" value="${ingredient}" />
        <span class="custom-checkbox"></span>
        Sem ${ingredient}
      </span>
    `;
    removeIngredientsContainer.appendChild(label);
  });

  removeIngredientsSection.style.display = 'block';
}

function renderDrinkOptions(productName) {
  removeIngredientsContainer.innerHTML = '';
  const flavors = DRINK_OPTIONS[productName] || [];

  if (flavors.length === 0) {
    removeIngredientsSection.style.display = 'none';
    return;
  }

  const h4 = removeIngredientsSection.querySelector('h4');
  if (h4) h4.textContent = 'Escolha o sabor:';

  flavors.forEach((flavor, index) => {
    const label = document.createElement('label');
    label.className = 'extra-option';
    label.innerHTML = `
      <span>
        <input type="radio" name="drinkFlavor" value="${flavor}" ${index === 0 ? 'checked' : ''} />
        <span class="custom-radio"></span>
        ${flavor}
      </span>
    `;
    removeIngredientsContainer.appendChild(label);
  });

  removeIngredientsSection.style.display = 'block';
}

function renderExtrasOptions() {
  extrasContainer.innerHTML = '';
  AVAILABLE_EXTRAS.forEach((extra, idx) => {
    const label = document.createElement('label');
    label.className = 'extra-option';
    label.innerHTML = `
      <span>
        <input type="checkbox" data-index="${idx}" />
        <span class="custom-checkbox"></span>
        ${extra.name}
      </span>
      <span class="price">+${formatCurrency(extra.price)}</span>
    `;
    extrasContainer.appendChild(label);
  });
  extrasSection.style.display = 'block';
}

function openQuantityModal(name, price, isDrink = false) {
  selectedProduct = { name, price: Number(price), isDrink };
  modalProductName.textContent = name;
  productQtyInput.value = 1;

  if (swapMeatCheckbox) swapMeatCheckbox.checked = false;

  if (isDrink) {
    if (meatOptionSection) meatOptionSection.style.display = 'none';
    extrasSection.style.display = 'none';
    renderDrinkOptions(name);
  } else {
    const isSupreme = name.toLowerCase().includes('supreme');
    if (meatOptionSection) {
      meatOptionSection.style.display = isSupreme ? 'block' : 'none';
    }
    renderRemoveIngredientsOptions(name);
    renderExtrasOptions();
  }

  qtyModal.classList.add('active');
  qtyModal.setAttribute('aria-hidden', 'false');
}

function closeQuantityModal() {
  selectedProduct = null;
  qtyModal.classList.remove('active');
  qtyModal.setAttribute('aria-hidden', 'true');
}

btnPlus.addEventListener('click', () => {
  productQtyInput.value = (parseInt(productQtyInput.value, 10) || 1) + 1;
});

btnMinus.addEventListener('click', () => {
  const current = parseInt(productQtyInput.value, 10) || 1;
  if (current > 1) productQtyInput.value = current - 1;
});

btnCancelQty.addEventListener('click', closeQuantityModal);

// Confirmar adição de item ao carrinho
btnConfirmQty.addEventListener('click', () => {
  if (!selectedProduct) return;

  const qty = parseInt(productQtyInput.value, 10);
  if (isNaN(qty) || qty <= 0) return;

  let baseName = selectedProduct.name;
  let unitPrice = selectedProduct.price;
  let selectedExtras = [];
  let removedList = [];

  if (selectedProduct.isDrink) {
    const selectedFlavor = removeIngredientsContainer.querySelector('input[name="drinkFlavor"]:checked');
    if (selectedFlavor) {
      baseName += ` (${selectedFlavor.value})`;
    }
  } else {
    if (swapMeatCheckbox && swapMeatCheckbox.checked && selectedProduct.name.toLowerCase().includes('supreme')) {
      baseName += ' (c/ Hambúrguer de Carne)';
      unitPrice += SWAP_MEAT_PRICE;
    }

    const removedChecks = removeIngredientsContainer.querySelectorAll('.remove-ingredient-check:checked');
    removedList = Array.from(removedChecks).map(chk => chk.value);

    const selectedCheckboxes = extrasContainer.querySelectorAll('input[type="checkbox"]:checked');
    selectedCheckboxes.forEach(chk => {
      const extraData = AVAILABLE_EXTRAS[Number(chk.dataset.index)];
      selectedExtras.push(extraData);
      unitPrice += extraData.price;
    });
  }

  const itemKey = JSON.stringify({
    baseName,
    removedList,
    extrasNames: selectedExtras.map(e => e.name).sort()
  });

  const existingItem = cart.find(item => item.itemKey === itemKey);

  if (existingItem) {
    existingItem.qty += qty;
  } else {
    cart.push({
      itemKey,
      name: baseName,
      unitPrice: unitPrice,
      qty: qty,
      removedList: removedList,
      extras: selectedExtras
    });
  }

  renderCart();
  closeQuantityModal();
});

// Renderização do Carrinho
function renderCart() {
  orderItems.innerHTML = '';
  const hasItems = cart.length > 0;
  cartEmptyElement.style.display = hasItems ? 'none' : 'block';

  let totalItemsCount = 0;
  let totalValue = 0;

  cart.forEach((item, index) => {
    totalItemsCount += item.qty;
    const itemTotal = item.unitPrice * item.qty;
    totalValue += itemTotal;

    let detailsHtml = '';
    if (item.removedList && item.removedList.length > 0) {
      detailsHtml += `<span style="display: block; font-size: 0.8em; color: #ff6b6b;">Sem: ${item.removedList.join(', ')}</span>`;
    }
    if (item.extras && item.extras.length > 0) {
      const extrasStr = item.extras.map(e => `+${e.name} (${formatCurrency(e.price)})`).join(', ');
      detailsHtml += `<span style="display: block; font-size: 0.8em; color: #ff8c00;">Adicionais: ${extrasStr}</span>`;
    }

    const row = document.createElement('div');
    row.className = 'order-row';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.marginBottom = '10px';

    row.innerHTML = `
      <div style="display: flex; flex-direction: column; flex: 1; padding-right: 8px;">
        <span><strong>${item.qty}x</strong> ${item.name}</span>
        ${detailsHtml}
        <span class="price" style="font-size: 0.85em; opacity: 0.8; margin-top: 2px;">${formatCurrency(itemTotal)}</span>
      </div>
      <button type="button" class="btn-remove-item" data-index="${index}" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer; font-size: 1.4em; font-weight: bold; padding: 0 8px; line-height: 1;" title="Remover item">
        &times;
      </button>
    `;

    orderItems.appendChild(row);
  });

  orderItems.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      removeFromCart(idx);
    });
  });

  if (cartCountElement) cartCountElement.textContent = totalItemsCount;
  totalElement.textContent = formatCurrency(totalValue);
}

// Finalização do pedido
btnCheckout.addEventListener('click', async () => {
  if (cart.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }

  const customerName = customerNameInput ? customerNameInput.value.trim() : '';
  if (!customerName) {
    alert('Por favor, informe seu nome para a chamada do pedido.');
    if (customerNameInput) customerNameInput.focus();
    return;
  }

  const totalItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalValue = cart.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);

  const payload = {
    customerName,
    items: cart,
    total: totalValue
  };

  try {
    btnCheckout.disabled = true;
    btnCheckout.textContent = 'Enviando...';

    const response = await fetch('http://localhost:3000/api/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar pedido');
    }

    const data = await response.json();

    // Exibe a confirmação destacando apenas o NOME do cliente
    orderSuccessDetails.innerHTML = `
      <p style="font-size: 1.5rem; color: #ff8c00; margin-bottom: 12px; text-align: center; text-transform: uppercase;"><strong>${data.customerName}</strong></p>
      <p style="margin-bottom: 4px;"><strong>Qtd. de itens:</strong> ${totalItemsCount}</p>
      <p style="margin-bottom: 8px;"><strong>Total:</strong> ${formatCurrency(totalValue)}</p>
      <p style="font-size: 0.85rem; color: #aaa; text-align: center; margin-top: 12px;">Acompanhe seu nome no painel da loja!</p>
    `;

    cartModal.classList.remove('active');
    cartModal.setAttribute('aria-hidden', 'true');

    orderSuccessModal.classList.add('active');
    orderSuccessModal.setAttribute('aria-hidden', 'false');

  } catch (err) {
    alert('Ocorreu um erro ao enviar seu pedido. Verifique se o servidor backend está rodando.');
    console.error(err);
  } finally {
    btnCheckout.disabled = false;
    btnCheckout.textContent = 'Finalizar Pedido';
  }
});

// Fechar modal de sucesso
btnCloseSuccessModal.addEventListener('click', () => {
  orderSuccessModal.classList.remove('active');
  orderSuccessModal.setAttribute('aria-hidden', 'true');
  
  resetCart();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Eventos de Abertura/Fechamento dos Modais
cartFloatingBtn.addEventListener('click', () => {
  cartModal.classList.add('active');
  cartModal.setAttribute('aria-hidden', 'false');
});

closeCartModalBtn.addEventListener('click', () => {
  cartModal.classList.remove('active');
  cartModal.setAttribute('aria-hidden', 'true');
});

window.addEventListener('click', event => {
  if (event.target === qtyModal) closeQuantityModal();
  if (event.target === cartModal) cartModal.classList.remove('active');
  if (event.target === orderSuccessModal) {
    orderSuccessModal.classList.remove('active');
    resetCart();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeQuantityModal();
    cartModal.classList.remove('active');
    if (orderSuccessModal.classList.contains('active')) {
      orderSuccessModal.classList.remove('active');
      resetCart();
    }
  }
});

document.querySelectorAll('[data-name][data-price]').forEach(item => {
  item.addEventListener('click', () => {
    const isDrink = item.classList.contains('drink');
    openQuantityModal(item.dataset.name, item.dataset.price, isDrink);
  });
});

renderCart();