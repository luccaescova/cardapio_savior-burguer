let cart = [];
let selectedProduct = null;

const removableIngredients = {
  Texas: ['Cebola Roxa', 'Alface', 'Rúcula', 'Bacon', 'Molho Barbecue'],
  Classic: ['Cebola Roxa', 'Alface Americana', 'Bacon'],
  Vegano: ['Cebola Roxa', 'Alface Americana', 'Tomate'],
  Ruby: ['Cheddar'],
  Caribe: ['Cebola Caramelizada', 'Bacon'],
  Verona: ['Cebola Roxa', 'Rúcula', 'Bacon', 'Mel'],
  Supreme: ['Cebola Roxa', 'Alface', 'Tomate', 'Catupiry', 'Cebola Crispy'],
  Viena: ['Cebola Roxa', 'Rúcula', 'Tomate', 'Picles', 'Bacon'],
  Gold: ['Cebola Roxa', 'Alface Americana', 'Bacon']
};

const availableExtras = [
  { name: 'Hambúrguer 210g extra', price: 12.00 },
  { name: 'Bacon extra', price: 6.00 },
  { name: 'Queijo Cheddar extra', price: 5.00 },
  { name: 'Maionese da casa extra', price: 4.00 }
];

const qtyModal = document.getElementById('quantityModal');
const modalProductName = document.getElementById('modalProductName');
const productQtyInput = document.getElementById('productQty');
const removeIngredientsSection = document.getElementById('removeIngredientsSection');
const removeIngredientsContainer = document.getElementById('removeIngredientsContainer');
const meatOptionSection = document.getElementById('meatOptionSection');
const swapMeatCheckbox = document.getElementById('swapMeatCheckbox');
const extrasSection = document.getElementById('extrasSection');
const extrasContainer = document.getElementById('extrasContainer');

const cartModal = document.getElementById('cartModal');
const cartFloatingBtn = document.getElementById('cartFloatingBtn');
const closeCartModal = document.getElementById('closeCartModal');
const cartCount = document.getElementById('cartCount');
const cartEmpty = document.getElementById('cartEmpty');
const orderItems = document.getElementById('orderItems');
const totalElement = document.getElementById('total');
const customerNameInput = document.getElementById('customerNameInput');

window.openQuantityModal = function(name, price, isDrink = false) {
  selectedProduct = { name, price: Number(price), isDrink };

  if (modalProductName) modalProductName.textContent = name;
  if (productQtyInput) productQtyInput.value = 1;

  if (isDrink) {
    if (removeIngredientsSection) removeIngredientsSection.style.display = 'none';
    if (meatOptionSection) meatOptionSection.style.display = 'none';
    if (extrasSection) extrasSection.style.display = 'none';
  } else {
    renderRemoveIngredientsOptions(name);
    renderMeatOption(name);
    renderExtrasOptions();
  }

  if (qtyModal) qtyModal.classList.add('active');
};

function renderRemoveIngredientsOptions(productName) {
  if (!removeIngredientsContainer) return;
  removeIngredientsContainer.innerHTML = '';

  const ingredients = removableIngredients[productName] || [];
  if (ingredients.length === 0) {
    removeIngredientsSection.style.display = 'none';
    return;
  }

  removeIngredientsSection.style.display = 'block';
  ingredients.forEach(ing => {
    const label = document.createElement('label');
    label.className = 'extra-option';
    label.innerHTML = `
      <span>
        <input type="checkbox" class="remove-ing-checkbox" value="${ing}" />
        <span class="custom-checkbox"></span>
        Sem ${ing}
      </span>
    `;
    removeIngredientsContainer.appendChild(label);
  });
}

function renderMeatOption(productName) {
  if (!meatOptionSection) return;
  if (swapMeatCheckbox) swapMeatCheckbox.checked = false;

  if (productName === 'Supreme') {
    meatOptionSection.style.display = 'block';
  } else {
    meatOptionSection.style.display = 'none';
  }
}

function renderExtrasOptions() {
  if (!extrasContainer) return;
  extrasContainer.innerHTML = '';
  extrasSection.style.display = 'block';

  availableExtras.forEach(extra => {
    const label = document.createElement('label');
    label.className = 'extra-option';
    label.innerHTML = `
      <span>
        <input type="checkbox" class="extra-checkbox" data-name="${extra.name}" data-price="${extra.price}" />
        <span class="custom-checkbox"></span>
        ${extra.name}
      </span>
      <span class="price">+R$ ${extra.price.toFixed(2)}</span>
    `;
    extrasContainer.appendChild(label);
  });
}

document.getElementById('btnMinus')?.addEventListener('click', () => {
  let val = parseInt(productQtyInput.value) || 1;
  if (val > 1) productQtyInput.value = val - 1;
});

document.getElementById('btnPlus')?.addEventListener('click', () => {
  let val = parseInt(productQtyInput.value) || 1;
  if (val < 99) productQtyInput.value = val + 1;
});

document.getElementById('btnCancelQty')?.addEventListener('click', () => {
  if (qtyModal) qtyModal.classList.remove('active');
});

document.getElementById('btnConfirmQty')?.addEventListener('click', () => {
  if (!selectedProduct) return;

  const quantity = parseInt(productQtyInput.value) || 1;
  let finalPrice = selectedProduct.price;
  let removed = [];
  let swapMeat = false;
  let extras = [];

  if (!selectedProduct.isDrink) {
    document.querySelectorAll('.remove-ing-checkbox:checked').forEach(cb => {
      removed.push(cb.value);
    });

    if (swapMeatCheckbox && swapMeatCheckbox.checked) {
      swapMeat = true;
      finalPrice += 10.00;
    }

    document.querySelectorAll('.extra-checkbox:checked').forEach(cb => {
      const exName = cb.getAttribute('data-name');
      const exPrice = parseFloat(cb.getAttribute('data-price'));
      extras.push(exName);
      finalPrice += exPrice;
    });
  }

  cart.push({
    name: selectedProduct.name,
    price: finalPrice,
    quantity: quantity,
    removed: removed,
    swapMeat: swapMeat,
    extras: extras
  });

  updateCartUI();
  if (qtyModal) qtyModal.classList.remove('active');
});

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCount) cartCount.textContent = totalCount;

  if (!orderItems) return;
  orderItems.innerHTML = '';

  if (cart.length === 0) {
    if (cartEmpty) cartEmpty.style.display = 'block';
    if (totalElement) totalElement.textContent = 'R$ 0,00';
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  let grandTotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    grandTotal += itemTotal;

    const div = document.createElement('div');
    div.className = 'order-item';

    let detailsHtml = '';
    if (item.removed && item.removed.length > 0) {
      detailsHtml += `<br><small style="color: #ff6b6b;">Sem: ${item.removed.join(', ')}</small>`;
    }
    if (item.swapMeat) {
      detailsHtml += `<br><small style="color: #ff8c00;">Com Carne (+R$10)</small>`;
    }
    if (item.extras && item.extras.length > 0) {
      detailsHtml += `<br><small style="color: #4cd137;">Add: ${item.extras.join(', ')}</small>`;
    }

    div.innerHTML = `
      <div style="flex: 1;">
        <strong>${item.quantity}x ${item.name}</strong> - R$ ${itemTotal.toFixed(2)}
        ${detailsHtml}
      </div>
      <button type="button" onclick="removeItemFromCart(${index})" style="background:none; border:none; color:#ff4757; cursor:pointer; font-weight:bold; margin-left:10px;">X</button>
    `;
    orderItems.appendChild(div);
  });

  if (totalElement) totalElement.textContent = `R$ ${grandTotal.toFixed(2)}`;
}

window.removeItemFromCart = function(index) {
  cart.splice(index, 1);
  updateCartUI();
};

cartFloatingBtn?.addEventListener('click', () => {
  if (cartModal) cartModal.classList.add('active');
});

closeCartModal?.addEventListener('click', () => {
  if (cartModal) cartModal.classList.remove('active');
});

// Finalizar Pedido e Enviar para Impressão
document.getElementById('btnCheckout')?.addEventListener('click', async () => {
  const customerName = customerNameInput?.value.trim();

  if (!customerName) {
    alert('Por favor, digite o nome do cliente!');
    return;
  }

  if (cart.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }

  const orderData = {
    orderId: Math.floor(1000 + Math.random() * 9000),
    customerName: customerName,
    items: cart,
    total: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)
  };

  try {
    const response = await fetch('/api/print-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ Impressão enviada com sucesso!');
    } else {
      alert(`Aviso: ${result.error}`);
    }
  } catch (err) {
    console.error('Erro de conexão:', err);
    alert('Não foi possível conectar com o servidor local.');
  }

  const successModal = document.getElementById('orderSuccessModal');
  if (successModal) successModal.classList.add('active');

  cart = [];
  if (customerNameInput) customerNameInput.value = '';
  updateCartUI();
  if (cartModal) cartModal.classList.remove('active');
});

document.getElementById('btnCloseSuccessModal')?.addEventListener('click', () => {
  const successModal = document.getElementById('orderSuccessModal');
  if (successModal) successModal.classList.remove('active');
});