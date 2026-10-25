const state = {
  products: [],
  cart: [],
  sales: [],
  settings: {
    storeName: 'Smart Duka',
    shopSlug: 'smartduka',
    remotePin: '1234'
  },
  user: null,
  remoteCredentials: {
    slug: 'smartduka',
    pin: '1234'
  }
};

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export function money(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleString('en-KE');
}

export function renderProductCard(product, addToCart) {
  return `
    <div class="product-card">
      <div class="product-thumb">🛒</div>
      <h4>${product.name}</h4>
      <div class="meta">${product.category || 'General'} · ${product.stock} ${product.unit || 'unit'} left</div>
      <span class="price">${money(product.price)}</span>
      <button class="primary" data-product-id="${product.id}" data-add="1">Add</button>
    </div>
  `;
}

export function renderList(list, emptyText) {
  if (!list.length) return `<div class="muted">${emptyText}</div>`;
  return list.map((item) => `
    <div class="list-row">
      <span>${item.name}</span>
      <strong>${item.qty || item.stock || item.total || ''}</strong>
    </div>
  `).join('');
}

export default state;
