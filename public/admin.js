import { fetchJson, money, renderProductCard, renderList } from './app-lib.js';

const state = {
  user: null,
  products: [],
  cart: [],
  currentPage: 'pos',
  analytics: null,
  settings: {}
};

const els = {
  pageTitle: document.getElementById('pageTitle'),
  productList: document.getElementById('productList'),
  productSearch: document.getElementById('productSearch'),
  barcodeInput: document.getElementById('barcodeInput'),
  cartList: document.getElementById('cartList'),
  subtotal: document.getElementById('subtotal'),
  grandTotal: document.getElementById('grandTotal'),
  paymentMethod: document.getElementById('paymentMethod'),
  mpesaBox: document.getElementById('mpesaBox'),
  customerPhone: document.getElementById('customerPhone'),
  discount: document.getElementById('discount'),
  salesCount: document.getElementById('salesCount'),
  revenueValue: document.getElementById('revenueValue'),
  lowStockValue: document.getElementById('lowStockValue'),
  frequentProducts: document.getElementById('frequentProducts'),
  slowProducts: document.getElementById('slowProducts'),
  productTable: document.getElementById('productTable'),
  storeName: document.getElementById('storeName'),
  shopSlug: document.getElementById('shopSlug'),
  remotePin: document.getElementById('remotePin'),
  phone: document.getElementById('phone'),
  address: document.getElementById('address'),
  currentUser: document.getElementById('currentUser'),
  systemName: document.getElementById('systemName')
};

function togglePage(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav').forEach((el) => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach((el) => el.classList.toggle('active', el.id === `page-${page}`));
  els.pageTitle.textContent = page === 'pos' ? 'Point of Sale' : page === 'products' ? 'Products' : page === 'analytics' ? 'Product Intelligence' : 'Settings';
}

document.querySelectorAll('.nav').forEach((button) => {
  button.addEventListener('click', () => togglePage(button.dataset.page));
});

function addToCart(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;
  const existing = state.cart.find((item) => item.id === productId);
  if (existing) existing.qty += 1;
  else state.cart.push({ ...product, qty: 1 });
  renderCart();
}

function renderCart() {
  if (!state.cart.length) {
    els.cartList.innerHTML = '<div class="muted">No products in cart</div>';
  } else {
    els.cartList.innerHTML = state.cart.map((item) => `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <small class="muted">${item.qty} × ${money(item.price)}</small>
        </div>
        <strong>${money(item.qty * item.price)}</strong>
      </div>
    `).join('');
  }
  const subtotal = state.cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discount = Number(els.discount.value || 0);
  const total = Math.max(0, subtotal - discount);
  els.subtotal.textContent = money(subtotal);
  els.grandTotal.textContent = money(total);
}

document.getElementById('discount').addEventListener('input', renderCart);

document.getElementById('scanBtn').addEventListener('click', async () => {
  const code = els.barcodeInput.value.trim();
  if (!code) return;
  const product = state.products.find((p) => String(p.barcode || '').toLowerCase() === code.toLowerCase() || String(p.sku || '').toLowerCase() === code.toLowerCase());
  if (!product) {
    document.getElementById('barcodeStatus').textContent = 'No product found for that code';
    return;
  }
  addToCart(product.id);
  els.barcodeInput.value = '';
  document.getElementById('barcodeStatus').textContent = `${product.name} added to cart`;
});

async function loadProducts() {
  const data = await fetchJson('/api/products');
  state.products = data.products || [];
  renderProducts();
  renderTable();
}

function renderProducts() {
  const q = document.getElementById('productSearch').value.toLowerCase();
  const list = state.products.filter((p) => `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q));
  els.productList.innerHTML = list.map((p) => renderProductCard(p, addToCart)).join('');
  els.productList.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addToCart(btn.dataset.productId));
  });
}

document.getElementById('productSearch').addEventListener('input', renderProducts);

function renderTable() {
  const rows = state.products.map((p) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.sku}</td>
      <td>${p.stock}</td>
      <td>${money(p.price)}</td>
      <td>${p.barcode || '-'}</td>
    </tr>
  `).join('');
  els.productTable.innerHTML = `<table><thead><tr><th>Name</th><th>SKU</th><th>Stock</th><th>Price</th><th>Barcode</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function loadAnalytics() {
  const data = await fetchJson('/api/analytics');
  state.analytics = data.analytics;
  els.salesCount.textContent = state.analytics.todaySales || 0;
  els.revenueValue.textContent = money(state.analytics.totalRevenue || 0);
  els.lowStockValue.textContent = state.analytics.lowStock?.length || 0;
  els.frequentProducts.innerHTML = renderList((state.analytics.frequentProducts || []).map((item) => ({ name: item.name, qty: item.qty })), 'No frequent products yet');
  els.slowProducts.innerHTML = renderList((state.analytics.slowProducts || []).map((item) => ({ name: item.name, stock: item.stock })), 'No reorder focus yet');
}

async function login() {
  const username = document.getElementById('adminUser').value;
  const password = document.getElementById('adminPass').value;
  const data = await fetchJson('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  state.user = data.user;
  els.currentUser.textContent = data.user.name;
  if (window.location.pathname === '/admin.html') {
    window.location.href = '/';
  }
}

async function saveProduct() {
  const product = {
    name: document.getElementById('productFormName').value,
    sku: document.getElementById('productFormSku').value,
    barcode: document.getElementById('productFormBarcode').value,
    cost: Number(document.getElementById('productFormCost').value || 0),
    price: Number(document.getElementById('productFormPrice').value || 0),
    stock: Number(document.getElementById('productFormStock').value || 0),
    unit: document.getElementById('productFormUnit').value || 'piece',
    reorder: Number(document.getElementById('productFormReorder').value || 0),
    sellOnline: true
  };
  if (!product.name) return alert('Product name required');
  await fetchJson('/api/products', { method: 'POST', body: JSON.stringify(product) });
  await loadProducts();
}

document.getElementById('saveProductBtn').addEventListener('click', saveProduct);

document.getElementById('checkoutBtn').addEventListener('click', async () => {
  if (!state.cart.length) return alert('Add items to cart');
  const paymentMethod = els.paymentMethod.value;
  const payload = {
    cashier: state.user?.name || 'Cashier',
    paymentMethod,
    customerName: 'Walk-in',
    customerPhone: els.customerPhone.value || '',
    items: state.cart.map((item) => ({ productId: item.id, qty: item.qty }))
  };
  const res = await fetchJson('/api/sales', { method: 'POST', body: JSON.stringify(payload) });
  alert(`Sale complete: ${res.sale.number} / ${money(res.sale.total)}`);
  state.cart = [];
  renderCart();
  await loadProducts();
  await loadAnalytics();
});

document.getElementById('mpesaPromptBtn').addEventListener('click', async () => {
  if (!els.customerPhone.value) return alert('Enter customer phone');
  if (!state.cart.length) return alert('Cart is empty');
  const payload = {
    phone: els.customerPhone.value,
    amount: Number(state.cart.reduce((sum, item) => sum + item.qty * item.price, 0)),
    saleId: 'sale-' + Date.now(),
    slug: 'smartduka'
  };
  const res = await fetchJson('/api/mpesa/stk', { method: 'POST', body: JSON.stringify(payload) });
  alert('M-Pesa prompt sent. Check customer phone.');
  console.log(res);
});

document.getElementById('paymentMethod').addEventListener('change', () => {
  const show = document.getElementById('paymentMethod').value === 'MPESA';
  document.getElementById('mpesaBox').classList.toggle('hidden', !show);
});

async function saveSettings() {
  const payload = {
    storeName: document.getElementById('storeName').value,
    shopSlug: document.getElementById('shopSlug').value,
    remotePin: document.getElementById('remotePin').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value
  };
  const res = await fetchJson('/api/settings', { method: 'POST', body: JSON.stringify(payload) });
  alert('Settings saved');
  console.log(res);
}

document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

document.getElementById('logoutBtn').addEventListener('click', () => {
  state.user = null;
  window.location.href = '/admin.html';
});

document.getElementById('syncBtn').addEventListener('click', async () => {
  await loadProducts();
  await loadAnalytics();
  alert('Data synced');
});

async function loadSettings() {
  const data = await fetchJson('/api/bootstrap');
  state.settings = data.settings || {};
  els.storeName.value = state.settings.storeName || 'Smart Duka';
  els.shopSlug.value = state.settings.shopSlug || 'smartduka';
  els.remotePin.value = state.settings.remotePin || '1234';
  els.phone.value = state.settings.phone || '';
  els.address.value = state.settings.address || '';
  els.systemName.textContent = state.settings.storeName || 'Smart Duka';
}

async function init() {
  await loadSettings();
  await loadProducts();
  await loadAnalytics();
  renderCart();
  togglePage('pos');
}

if (window.location.pathname === '/admin.html') {
  document.getElementById('loginBtn').addEventListener('click', login);
} else {
  init();
}
