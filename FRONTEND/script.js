const API_URL = 'http://localhost:3000';

const AVAILABLE_EXTRAS = [
  { name: 'Bacon', price: 4.00 },
  { name: 'Alface', price: 2.00 },
  { name: 'Tomate', price: 2.00 },
  { name: 'Hambúrguer 210g', price: 15.00 },
  { name: 'Catupiry', price: 4.00 }
];

const DEFAULT_BURGER_INGREDIENTS = [
  'Maionese', 'Cebola Roxa', 'Alface', 'Rúcula', 'Queijo Cheddar', 
  'Queijo Mussarela', 'Queijo Canastra', 'Bacon', 'Molho Barbecue', 'Tomate'
];

const DRINK_OPTIONS = {
  'Refrigerante lata': ['Coca-Cola Normal', 'Coca-Cola Zero', 'Guaraná Normal', 'Guaraná Zero'],
  'Suco lata': ['Uva', 'Laranja']
};

const cart = [];
let selectedProduct = null;

const qtyModal = document.getElementById('quantityModal');
const modalProductName = document.getElementById('modalProductName');
const productQtyInput = document.getElementById('productQty');
const extrasSection = document.getElementById('extrasSection');
const extrasContainer = document.getElementById('extrasContainer');
const removeIngredientsSection = document.getElementById('removeIngredientsSection');
const removeIngredientsContainer = document.getElementById('removeIngredientsContainer');
const btnConfirmQty = document.getElementById('btnConfirmQty');
const btnCancelQty = document.getElementById('btnCancelQty');
const btnPlus = document.getElementById('btnPlus');
const btnMinus = document.getElementById('btnMinus');

const cartFloatingBtn = document.getElementById('cartFloatingBtn');
const cartModal = document.getElementById('cartModal');
const closeCartModalBtn = document.getElementById('closeCartModal');
const cartCountElement = document.getElementById('cartCount');
const orderItems = document.getElementById('orderItems');
const totalElement = document.getElementById('total');
const cartEmptyElement = document.getElementById('cartEmpty');
const btnCheckout = document.getElementById('btnCheckout');

const orderSuccessModal = document.getElementById('orderSuccessModal');
const orderSuccessDetails = document.getElementById('orderSuccessDetails');
const btnCloseSuccessModal = document.getElementById('btnCloseSuccessModal');

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function loadProductsFromDB() {
  const menuContainer = document.getElementById('menuContainer');
  if (!menuContainer) return;

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/products`);
    if (!res.ok) throw new Error('Erro ao buscar produtos');
    
    const products = await res.json();
    menuContainer.innerHTML = '';

    if (products.length === 0) {
      menuContainer.innerHTML = '<p style="color:#aaa;">Nenhum produto cadastrado no momento.</p>';
      return;
    }

    products.forEach(prod => {
      const isDrink = prod.category === 'bebida';
      const card = document.createElement('div');
      card.className = `menu-item ${isDrink ? 'drink' : ''}`;
      card.style.cursor = 'pointer';

      card.innerHTML = `
        <div class="item-info">
          <h3>${prod.name}</h3>
          <p class="description">${prod.description || ''}</p>
          <span class="price">${formatCurrency(prod.price)}</span>
        </div>
        ${prod.image ? `<img src="${prod.image}" alt="${prod.name}" class="card-img" style="object-fit: cover; width:100px; height:100px; border-radius:8px;">` : ''}
      `;

      card.addEventListener('click', () => {
        openQuantityModal(prod.name, prod.price, isDrink);
      });

      menuContainer.appendChild(card);
    });
  } catch (err) {
    console.error('Falha ao carregar produtos:', err);
  }
}

function openQuantityModal(name, price, isDrink = false) {
  selectedProduct = { name, price: Number(price), isDrink };
  modalProductName.textContent = name;
  productQtyInput.value = 1;

  if (isDrink) {
    extrasSection.style.display = 'none';
    renderDrinkOptions(name);
  } else {
    renderRemoveIngredientsOptions();
    renderExtrasOptions();
  }

  qtyModal.classList.add('active');
}

function closeQuantityModal() {
  selectedProduct = null;
  qtyModal.classList.remove('active');
}

function renderRemoveIngredientsOptions() {
  removeIngredientsContainer.innerHTML = '';
  DEFAULT_BURGER_INGREDIENTS.forEach((ingredient) => {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.innerHTML = `
      <input type="checkbox" class="remove-ingredient-check" value="${ingredient}" />
      Sem ${ingredient}
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

  flavors.forEach((flavor, index) => {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.innerHTML = `
      <input type="radio" name="drinkFlavor" value="${flavor}" ${index === 0 ? 'checked' : ''} />
      ${flavor}
    `;
    removeIngredientsContainer.appendChild(label);
  });
  removeIngredientsSection.style.display = 'block';
}

function renderExtrasOptions() {
  extrasContainer.innerHTML = '';
  AVAILABLE_EXTRAS.forEach((extra, idx) => {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.innerHTML = `
      <input type="checkbox" data-index="${idx}" />
      ${extra.name} (+${formatCurrency(extra.price)})
    `;
    extrasContainer.appendChild(label);
  });
  extrasSection.style.display = 'block';
}

btnPlus.addEventListener('click', () => { productQtyInput.value = (parseInt(productQtyInput.value) || 1) + 1; });
btnMinus.addEventListener('click', () => {
  const current = parseInt(productQtyInput.value) || 1;
  if (current > 1) productQtyInput.value = current - 1;
});
btnCancelQty.addEventListener('click', closeQuantityModal);

btnConfirmQty.addEventListener('click', () => {
  if (!selectedProduct) return;
  const qty = parseInt(productQtyInput.value) || 1;

  let baseName = selectedProduct.name;
  let unitPrice = selectedProduct.price;
  let selectedExtras = [];
  let removedList = [];

  if (selectedProduct.isDrink) {
    const selectedFlavor = removeIngredientsContainer.querySelector('input[name="drinkFlavor"]:checked');
    if (selectedFlavor) baseName += ` (${selectedFlavor.value})`;
  } else {
    const removedChecks = removeIngredientsContainer.querySelectorAll('.remove-ingredient-check:checked');
    removedList = Array.from(removedChecks).map(chk => chk.value);

    const selectedCheckboxes = extrasContainer.querySelectorAll('input[type="checkbox"]:checked');
    selectedCheckboxes.forEach(chk => {
      const extraData = AVAILABLE_EXTRAS[Number(chk.dataset.index)];
      selectedExtras.push(extraData);
      unitPrice += extraData.price;
    });
  }

  cart.push({
    name: baseName,
    unitPrice: unitPrice,
    qty: qty,
    removedList: removedList,
    extras: selectedExtras
  });

  renderCart();
  closeQuantityModal();
});

function renderCart() {
  orderItems.innerHTML = '';
  const hasItems = cart.length > 0;
  cartEmptyElement.style.display = hasItems ? 'none' : 'block';

  let totalItems = 0;
  let totalValue = 0;

  cart.forEach((item, index) => {
    totalItems += item.qty;
    const itemTotal = item.unitPrice * item.qty;
    totalValue += itemTotal;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-between; margin-bottom:10px;';
    row.innerHTML = `
      <div>
        <strong>${item.qty}x ${item.name}</strong> - ${formatCurrency(itemTotal)}
      </div>
      <button onclick="cart.splice(${index},1); renderCart();" style="color:red; background:none; border:none; cursor:pointer;">&times;</button>
    `;
    orderItems.appendChild(row);
  });

  if (cartCountElement) cartCountElement.textContent = totalItems;
  totalElement.textContent = formatCurrency(totalValue);
}

btnCheckout.addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  if (!token) return alert('Faça login novamente.');
  if (cart.length === 0) return alert('Carrinho vazio!');

  const totalValue = cart.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);

  try {
    btnCheckout.disabled = true;
    const response = await fetch(`${API_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: cart, total: totalValue })
    });

    if (!response.ok) throw new Error('Erro ao enviar pedido');

    const data = await response.json();
    orderSuccessDetails.innerHTML = `<p>Obrigado, <strong>${data.customerName}</strong>!</p>`;

    cartModal.classList.remove('active');
    orderSuccessModal.classList.add('active');
    cart.length = 0;
    renderCart();

  } catch (err) {
    alert(err.message);
  } finally {
    btnCheckout.disabled = false;
  }
});

btnCloseSuccessModal.addEventListener('click', () => orderSuccessModal.classList.remove('active'));
cartFloatingBtn.addEventListener('click', () => cartModal.classList.add('active'));
closeCartModalBtn.addEventListener('click', () => cartModal.classList.remove('active'));

document.addEventListener('DOMContentLoaded', () => {
  loadProductsFromDB();
});