const apiURL = '/api';

const state = {
  products: [],
  cart: []
};

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`;
}

async function loadCatalog() {
  const slug = new URLSearchParams(window.location.search).get('shop') || 'smartduka';
  const data = await fetch(`${apiURL}/catalog/${slug}`).then((res) => res.json());
  state.products = data.catalog?.products || [];
  renderProducts();
}

function renderProducts() {
  const q = document.getElementById('shopSearch').value.toLowerCase();
  const list = state.products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q));
  document.getElementById('shopProducts').innerHTML = list.map((p) => `
    <div class="product-item">
      <div class="product-thumb">🛍️</div>
      <h3>${p.name}</h3>
      <div class="meta">${p.category || 'General'} · ${p.stock} left</div>
      <strong>${money(p.price)}</strong>
      <button class="primary" data-id="${p.id}">Add to cart</button>
    </div>
  `).join('');
  document.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.id));
  });
}

function addToCart(id) {
  const product = state.products.find((p) => p.id === id);
  if (!product) return;
  const existing = state.cart.find((item) => item.id === id);
  if (existing) existing.qty += 1;
  else state.cart.push({ ...product, qty: 1 });
  updateCart();
  openCart();
}

function updateCart() {
  document.getElementById('cartCounter').textContent = String(state.cart.reduce((sum, item) => sum + item.qty, 0));
  const items = state.cart.map((item) => `
    <div class="list-row">
      <span>${item.name}</span>
      <strong>${item.qty} × ${money(item.price)}</strong>
    </div>
  `).join('');
  document.getElementById('drawerItems').innerHTML = items || '<div class="muted">Cart empty</div>';
  const total = state.cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  document.getElementById('shopTotal').textContent = money(total);
}

function openCart() { document.getElementById('cartDrawer').classList.remove('hidden'); }
function closeCart() { document.getElementById('cartDrawer').classList.add('hidden'); }

document.getElementById('shopSearch').addEventListener('input', renderProducts);

document.getElementById('checkoutShopBtn').addEventListener('click', async () => {
  const slug = new URLSearchParams(window.location.search).get('shop') || 'smartduka';
  const customerName = document.getElementById('customerName').value || 'Customer';
  const customerPhone = document.getElementById('customerPhone').value || '';
  const payload = {
    slug,
    customer: { name: customerName, phone: customerPhone },
    items: state.cart.map((item) => ({ id: item.id, qty: item.qty })),
    paymentMethod: 'STK'
  };
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then((r) => r.json());
  alert(`Order placed successfully: ${res.order.id}`);
  state.cart = [];
  updateCart();
  closeCart();
});

loadCatalog();
