// --- ESTADO GLOBAL DO CARRINHO E MODAL ---
let cart = [];
let currentProduct = null;

// Configuração de Adicionais e Ingredientes por Produto
const productCustomizations = {
  'Texas': {
    removable: ['Pão de Brioche', 'Maionese', 'Cebola Roxa', 'Alface', 'Rúcula', 'Cheddar', 'Mussarela', 'Canastra', 'Bacon', 'Molho Barbecue'],
    extras: ['Bacon Extra', 'Queijo Extra', 'Ovo', 'Carne 210g Extra']
  },
  'Classic': {
    removable: ['Pão de Brioche', 'Maionese', 'Cebola Roxa', 'Alface Americana', 'Cheddar', 'Bacon'],
    extras: ['Bacon Extra', 'Queijo Extra', 'Ovo', 'Carne 210g Extra']
  },
  'Vegano': {
    removable: ['Pão de Brioche', 'Maionese', 'Cebola Roxa', 'Alface Americana', 'Tomate'],
    extras: ['Queijo Vegano Extra', 'Molho Especial']
  },
  'Ruby': {
    removable: ['Pão de Brioche', 'Maionese', 'Cheddar'],
    extras: ['Bacon Extra', 'Queijo Extra', 'Ovo', 'Carne 210g Extra']
  },
  'Caribe': {
    removable: ['Pão de Brioche', 'Maionese', 'Canastra', 'Cebola Caramelizada', 'Bacon'],
    extras: ['Bacon Extra', 'Queijo Extra', 'Ovo', 'Carne 210g Extra']
  },
  'Verona': {
    removable: ['Pão de Brioche', 'Maionese', 'Cebola Roxa', 'Rúcula', 'Brie', 'Bacon', 'Mel'],
    extras: ['Bacon Extra', 'Queijo Brie Extra', 'Ovo', 'Carne 210g Extra']
  },
  'Supreme': {
    removable: ['Pão de Brioche', 'Maionese', 'Cebola Roxa', 'Alface', 'Tomate', 'Catupiry', 'Cebola Crispy'],
    extras: ['Bacon Extra', 'Catupiry Extra', 'Ovo']
  },
  'Viena': {
    removable: ['Pão de Brioche', 'Maionese', 'Cebola Roxa', 'Rúcula', 'Tomate', 'Picles', 'Bacon'],
    extras: ['Bacon Extra', 'Queijo Extra', 'Ovo', 'Carne 210g Extra']
  },
  'Gold': {
    removable: ['Pão de Brioche', 'Maionese', 'Cebola Roxa', 'Alface Americana', 'Cheddar', 'Bacon'],
    extras: ['Bacon Extra', 'Queijo Extra', 'Ovo', 'Carne 210g Extra']
  }
};

const EXTRA_PRICE = 5.00; // Preço padrão para adicionais de hambúrguer

// --- ABRIR MODAL DE QUANTIDADE E CUSTOMIZAÇÃO ---
function openQuantityModal(productName, price, hasFlavors = false) {
  currentProduct = { name: productName, basePrice: price, hasFlavors };
  
  document.getElementById('modalProductNameinnerText') || (document.getElementById('modalProductName').innerText = productName);
  document.getElementById('productQty').value = 1;

  // Gerenciamento de Sabores (Bebidas)
  const flavorSection = document.getElementById('flavorSection');
  const flavorContainer = document.getElementById('flavorContainer');
  
  if (flavorSection && flavorContainer) {
    if (hasFlavors) {
      flavorSection.style.display = 'block';
      flavorContainer.innerHTML = '';

      let flavorsList = [];
      if (productName.includes('Refrigerante')) {
        flavorsList = ['Coca-Cola', 'Coca-Cola Zero', 'Guaraná Antarctica', 'Guaraná Antártica Zero'];
      } else if (productName.includes('Suco')) {
        flavorsList = ['Laranja', 'Uva'];
      } else if (productName.includes('H20H')) {
        flavorsList = ['Limão', 'Limãozinho'];
      }

      flavorsList.forEach((flavor, index) => {
        flavorContainer.innerHTML += `
          <label class="extra-option" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; cursor:pointer;">
            <span>
              <input type="radio" name="drinkFlavor" value="${flavor}" ${index === 0 ? 'checked' : ''} style="margin-right:8px;" />
              ${flavor}
            </span>
          </label>
        `;
      });
    } else {
      flavorSection.style.display = 'none';
    }
  }

  // Gerenciamento de Ingredientes para Retirar
  const removeSection = document.getElementById('removeIngredientsSection');
  const removeContainer = document.getElementById('removeIngredientsContainer');
  const customConfig = productCustomizations[productName];

  if (removeSection && removeContainer) {
    if (customConfig && customConfig.removable && customConfig.removable.length > 0) {
      removeSection.style.display = 'block';
      removeContainer.innerHTML = '';
      customConfig.removable.forEach(ing => {
        removeContainer.innerHTML += `
          <label class="extra-option" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; cursor:pointer;">
            <span>
              <input type="checkbox" value="${ing}" class="remove-ing-checkbox" style="margin-right:8px;" />
              Sem ${ing}
            </span>
          </label>
        `;
      });
    } else {
      removeSection.style.display = 'none';
    }
  }

  // Gerenciamento de Troca de Carne (Exclusivo Supreme)
  const meatSection = document.getElementById('meatOptionSection');
  if (meatSection) {
    if (productName === 'Supreme') {
      meatSection.style.display = 'block';
      document.getElementById('swapMeatCheckbox').checked = false;
    } else {
      meatSection.style.display = 'none';
    }
  }

  // Gerenciamento de Adicionais
  const extrasSection = document.getElementById('extrasSection');
  const extrasContainer = document.getElementById('extrasContainer');
  if (extrasSection && extrasContainer) {
    if (customConfig && customConfig.extras && customConfig.extras.length > 0) {
      extrasSection.style.display = 'block';
      extrasContainer.innerHTML = '';
      customConfig.extras.forEach(extra => {
        extrasContainer.innerHTML += `
          <label class="extra-option" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; cursor:pointer;">
            <span>
              <input type="checkbox" value="${extra}" class="extra-item-checkbox" style="margin-right:8px;" />
              ${extra}
            </span>
            <span style="color:#ff8c00; font-weight:bold;">+R$ ${EXTRA_PRICE.toFixed(2).replace('.', ',')}</span>
          </label>
        `;
      });
    } else {
      extrasSection.style.display = 'none';
    }
  }

  const modal = document.getElementById('quantityModal');
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
}

// --- CONTROLE DE QUANTIDADE NO MODAL ---
document.getElementById('btnPlus')?.addEventListener('click', () => {
  const input = document.getElementById('productQty');
  if (input) input.value = Math.min(99, parseInt(input.value) + 1);
});

document.getElementById('btnMinus')?.addEventListener('click', () => {
  const input = document.getElementById('productQty');
  if (input) input.value = Math.max(1, parseInt(input.value) - 1);
});

document.getElementById('btnCancelQty')?.addEventListener('click', () => {
  document.getElementById('quantityModal').style.display = 'none';
});

// --- CONFIRMAR E ADICIONAR AO CARRINHO ---
document.getElementById('btnConfirmQty')?.addEventListener('click', () => {
  if (!currentProduct) return;

  const qty = parseInt(document.getElementById('productQty').value) || 1;
  let finalPrice = currentProduct.basePrice;

  let selectedFlavor = '';
  if (currentProduct.hasFlavors) {
    const checkedFlavor = document.querySelector('input[name="drinkFlavor"]:checked');
    if (checkedFlavor) selectedFlavor = checkedFlavor.value;
  }

  let removedList = [];
  document.querySelectorAll('.remove-ing-checkbox:checked').forEach(cb => {
    removedList.push(cb.value);
  });

  let swapMeat = false;
  const swapCheckbox = document.getElementById('swapMeatCheckbox');
  if (swapCheckbox && swapCheckbox.checked) {
    swapMeat = true;
    finalPrice += 10.00; // Adicional da troca de frango por carne no Supreme
  }

  let extrasList = [];
  document.querySelectorAll('.extra-item-checkbox:checked').forEach(cb => {
    extrasList.push(cb.value);
    finalPrice += EXTRA_PRICE;
  });

  const cartItem = {
    id: Date.now(),
    name: currentProduct.name,
    price: finalPrice,
    quantity: qty,
    flavor: selectedFlavor,
    removed: removedList,
    swapMeat: swapMeat,
    extras: extrasList
  };

  cart.push(cartItem);
  updateCartUI();

  document.getElementById('quantityModal').style.display = 'none';
});

// --- ATUALIZAR INTERFACE DO CARRINHO ---
function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCount) cartCount.innerText = totalCount;

  const orderItemsContainer = document.getElementById('orderItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const totalElement = document.getElementById('total');

  if (!orderItemsContainer) return;

  if (cart.length === 0) {
    if (cartEmpty) cartEmpty.style.display = 'block';
    orderItemsContainer.innerHTML = '';
    if (totalElement) totalElement.innerText = 'R$ 0,00';
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  orderItemsContainer.innerHTML = '';
  let grandTotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    grandTotal += itemTotal;

    let detailsHtml = '';
    if (item.flavor) detailsHtml += `<br><small style="color:#00f5d4;">Sabor: ${item.flavor}</small>`;
    if (item.removed && item.removed.length > 0) detailsHtml += `<br><small style="color:#ff4757;">Sem: ${item.removed.join(', ')}</small>`;
    if (item.swapMeat) detailsHtml += `<br><small style="color:#ffb703;">Troca por Carne (+R$ 10,00)</small>`;
    if (item.extras && item.extras.length > 0) detailsHtml += `<br><small style="color:#2ecc71;">Add: ${item.extras.join(', ')}</small>`;

    orderItemsContainer.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#181818; padding:10px; border-radius:6px; margin-bottom:8px;">
        <div>
          <strong>${item.quantity}x ${item.name}</strong>
          ${detailsHtml}
        </div>
        <div style="text-align:right;">
          <span style="color:#ff8c00; font-weight:bold;">R$ ${itemTotal.toFixed(2).replace('.', ',')}</span>
          <br>
          <button onclick="removeFromCart(${index})" style="background:transparent; border:none; color:#ff4757; cursor:pointer; font-size:0.85rem; margin-top:4px;">Remover</button>
        </div>
      </div>
    `;
  });

  if (totalElement) {
    totalElement.innerText = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

// --- ABRIR / FECHAR MODAL DO CARRINHO ---
document.getElementById('cartFloatingBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('cartModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }
});

document.getElementById('closeCartModal')?.addEventListener('click', () => {
  const modal = document.getElementById('cartModal');
  if (modal) modal.style.display = 'none';
});

// --- FINALIZAR PEDIDO (CHECKOUT) ---
document.getElementById('btnCheckout')?.addEventListener('click', async () => {
  if (cart.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }

  const customerNameInput = document.getElementById('customerNameInput');
  const customerName = customerNameInput ? customerNameInput.value.trim() : '';

  if (!customerName) {
    alert('Por favor, informe o seu nome para chamada.');
    if (customerNameInput) customerNameInput.focus();
    return;
  }

  const totalOrderPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const orderPayload = {
    customerName: customerName,
    items: cart,
    total: totalOrderPrice
  };

  try {
    const response = await fetch('/api/print-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('cartModal').style.display = 'none';
      cart = [];
      updateCartUI();
      if (customerNameInput) customerNameInput.value = '';

      // Mostra modal de sucesso
      const successModal = document.getElementById('orderSuccessModal');
      if (successModal) {
        successModal.style.display = 'flex';
        successModal.setAttribute('aria-hidden', 'false');
      }
    } else {
      alert('Erro ao enviar o pedido. Tente novamente.');
    }
  } catch (err) {
    console.error('Erro na requisição de checkout:', err);
    alert('Erro de comunicação com o servidor.');
  }
});

document.getElementById('btnCloseSuccessModal')?.addEventListener('click', () => {
  const successModal = document.getElementById('orderSuccessModal');
  if (successModal) successModal.style.display = 'none';
});