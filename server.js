import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import { v4 as uuid } from 'uuid';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT || 3000);
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'smartduka-salt', 100000, 64, 'sha512').toString('hex');
}

function getToday() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'shop';
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function getShopDefaultSettings(shopName = 'Smart Duka') {
  return {
    storeName: shopName,
    shopSlug: slugify(shopName),
    remotePin: '1234',
    phone: '',
    address: '',
    mpesaShortcode: '',
    mpesaEnv: 'sandbox',
    mpesaTransactionType: 'CustomerPayBillOnline'
  };
}

function buildLegacySettingsFromShop(shop) {
  return {
    ...(shop?.settings || {}),
    storeName: shop?.name || shop?.settings?.storeName || 'Smart Duka',
    shopSlug: shop?.slug || shop?.settings?.shopSlug || 'smartduka',
    remotePin: shop?.settings?.remotePin || '1234'
  };
}

function findShopByTarget(shops, target) {
  if (!shops || !shops.length) return null;
  if (!target) return shops[0] || null;
  const raw = String(target).trim();
  if (!raw) return shops[0] || null;
  return shops.find((shop) => {
    const id = String(shop.id || '');
    const slug = String(shop.slug || '');
    return id === raw || slug === raw.toLowerCase() || slug === slugify(raw);
  }) || shops[0];
}

function resolveShopId(db, req, fallbackShopId = null) {
  const body = req.body || {};
  const query = req.query || {};
  const params = req.params || {};

  const explicit =
    query.shopId ||
    query.shop_id ||
    body.shopId ||
    body.shop_id ||
    params.shopId ||
    params.shop_id ||
    query.shop ||
    body.shop ||
    req.headers['x-shop-id'] ||
    req.headers['x-shop'] ||
    req.headers['x-shop-slug'];

  if (explicit) {
    const shop = findShopByTarget(db.shops || [], explicit);
    if (shop && shop.id) return shop.id;
  }

  if (fallbackShopId) return fallbackShopId;

  const defaultShop = (db.shops || [])[0];
  return defaultShop ? defaultShop.id : null;
}

function resolveShop(db, req, fallbackShopId = null) {
  const shopId = resolveShopId(db, req, fallbackShopId);
  if (!shopId) return null;
  return (db.shops || []).find((shop) => String(shop.id) === String(shopId)) || null;
}

function normalizeProductRecord(product, shopId) {
  return {
    ...product,
    shopId: product.shopId || shopId,
    status: product.status || 'ACTIVE',
    sellOnline: !!product.sellOnline,
    stock: Number(product.stock || 0),
    cost: Number(product.cost || 0),
    price: Number(product.price || 0),
    reorder: Number(product.reorder || 5),
    unit: product.unit || 'piece'
  };
}

function normalizeSaleRecord(sale, shopId) {
  return {
    ...sale,
    shopId: sale.shopId || shopId,
    total: Number(sale.total || 0),
    status: sale.status || 'PAID',
    items: Array.isArray(sale.items) ? sale.items : []
  };
}

function normalizeOrderRecord(order, shopId) {
  return {
    ...order,
    shopId: order.shopId || shopId,
    status: order.status || 'PENDING',
    total: Number(order.total || 0),
    items: Array.isArray(order.items) ? order.items : []
  };
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await access(STORE_PATH, constants.F_OK);
  } catch {
    const defaultShop = {
      id: 'shop-default',
      name: 'Smart Duka',
      slug: 'smartduka',
      status: 'ACTIVE',
      createdAt: Date.now(),
      settings: getShopDefaultSettings('Smart Duka')
    };

    const seed = {
      shops: [defaultShop],
      users: [
        { id: 'admin-1', shopId: 'shop-default', name: 'Administrator', username: 'admin', password: hashPassword('Admin123!'), role: 'ADMIN', status: 'ACTIVE' },
        { id: 'cashier-1', shopId: 'shop-default', name: 'Cashier', username: 'cashier', password: hashPassword('Cashier123!'), role: 'CASHIER', status: 'ACTIVE' }
      ],
      settings: {
        storeName: 'Smart Duka',
        shopSlug: 'smartduka',
        remotePin: '1234',
        phone: '',
        address: '',
        mpesaShortcode: '',
        mpesaEnv: 'sandbox',
        mpesaTransactionType: 'CustomerPayBillOnline'
      },
      products: [
        { id: 'p-1', shopId: 'shop-default', sku: 'SKU001', name: 'Maize Flour 2kg', category: 'Groceries', stock: 50, cost: 180, price: 260, reorder: 12, unit: 'packet', barcode: '1001', sellOnline: true, status: 'ACTIVE', createdAt: getToday() },
        { id: 'p-2', shopId: 'shop-default', sku: 'SKU002', name: 'Rice 5kg', category: 'Groceries', stock: 40, cost: 400, price: 620, reorder: 8, unit: 'bag', barcode: '1002', sellOnline: true, status: 'ACTIVE', createdAt: getToday() },
        { id: 'p-3', shopId: 'shop-default', sku: 'SKU003', name: 'Cooking Oil 1L', category: 'Groceries', stock: 60, cost: 220, price: 330, reorder: 15, unit: 'bottle', barcode: '1003', sellOnline: true, status: 'ACTIVE', createdAt: getToday() },
        { id: 'p-4', shopId: 'shop-default', sku: 'SKU004', name: 'Soap Bar', category: 'Household', stock: 80, cost: 55, price: 90, reorder: 20, unit: 'piece', barcode: '1004', sellOnline: true, status: 'ACTIVE', createdAt: getToday() }
      ],
      customers: [],
      sales: [],
      orders: [],
      shifts: [],
      stockMovements: [],
      audit: [],
      mpesaCallbacks: [],
      remoteOrders: [],
      catalog: {
        slug: 'smartduka',
        products: [],
        updatedAt: null
      }
    };

    await writeFile(STORE_PATH, JSON.stringify(seed, null, 2));
  }
}

function migrateStore(data) {
  const cloneData = clone(data || {});
  const legacyDefaultShop = cloneData.shops && cloneData.shops.length ? cloneData.shops[0] : null;

  const shops = Array.isArray(cloneData.shops) && cloneData.shops.length
    ? cloneData.shops.map((shop) => ({
        id: shop.id || `shop-${slugify(shop.name || shop.slug || 'smartduka')}-${Date.now().toString(36)}`,
        name: shop.name || shop.settings?.storeName || 'Smart Duka',
        slug: slugify(shop.slug || shop.settings?.shopSlug || shop.name || 'smartduka'),
        status: shop.status || 'ACTIVE',
        createdAt: shop.createdAt || Date.now(),
        settings: {
          ...(shop.settings || {}),
          storeName: shop.name || shop.settings?.storeName || 'Smart Duka',
          shopSlug: slugify(shop.slug || shop.settings?.shopSlug || shop.name || 'smartduka'),
          remotePin: shop.settings?.remotePin || '1234'
        }
      }))
    : [{
        id: 'shop-default',
        name: cloneData.settings?.storeName || 'Smart Duka',
        slug: slugify(cloneData.settings?.shopSlug || 'smartduka'),
        status: 'ACTIVE',
        createdAt: Date.now(),
        settings: {
          ...(cloneData.settings || {}),
          storeName: cloneData.settings?.storeName || 'Smart Duka',
          shopSlug: slugify(cloneData.settings?.shopSlug || 'smartduka'),
          remotePin: cloneData.settings?.remotePin || '1234'
        }
      }];

  if (!shops.find((shop) => String(shop.slug) === 'smartduka')) {
    shops.unshift({
      id: 'shop-default',
      name: cloneData.settings?.storeName || 'Smart Duka',
      slug: 'smartduka',
      status: 'ACTIVE',
      createdAt: Date.now(),
      settings: getShopDefaultSettings(cloneData.settings?.storeName || 'Smart Duka')
    });
  }

  const defaultShopId = shops[0].id;

  const users = (cloneData.users || []).map((user) => ({
    ...user,
    shopId: user.shopId || defaultShopId,
    role: user.role || 'CASHIER'
  }));

  const products = (cloneData.products || []).map((product) => normalizeProductRecord(product, product.shopId || defaultShopId));
  const sales = (cloneData.sales || []).map((sale) => normalizeSaleRecord(sale, sale.shopId || defaultShopId));
  const orders = (cloneData.orders || []).map((order) => normalizeOrderRecord(order, order.shopId || defaultShopId));

  const migrated = {
    ...cloneData,
    shops,
    users,
    products,
    sales,
    orders,
    customers: cloneData.customers || [],
    shifts: cloneData.shifts || [],
    stockMovements: cloneData.stockMovements || [],
    audit: cloneData.audit || [],
    mpesaCallbacks: cloneData.mpesaCallbacks || [],
    remoteOrders: cloneData.remoteOrders || [],
    settings: cloneData.settings || buildLegacySettingsFromShop(legacyDefaultShop || shops[0]),
    catalog: cloneData.catalog || { slug: shops[0].slug, products: [], updatedAt: null }
  };

  return migrated;
}

async function loadStore() {
  await ensureStore();
  const raw = await readFile(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const migrated = migrateStore(parsed);
  if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
    await saveStore(migrated);
  }
  return migrated;
}

async function saveStore(data) {
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2));
}

function buildCatalog(db, shopId) {
  const shop = (db.shops || []).find((entry) => String(entry.id) === String(shopId)) || (db.shops || [])[0];
  const catalogShopId = shop ? shop.id : null;
  const products = (db.products || [])
    .filter((p) => String(p.shopId || db.settings?.shopSlug || 'shop-default') === String(catalogShopId || 'shop-default'))
    .filter((p) => p.status === 'ACTIVE' && p.sellOnline)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: Number(p.price || 0),
      stock: Number(p.stock || 0),
      unit: p.unit || 'piece',
      imageData: p.imageData || '',
      barcode: p.barcode || '',
      reorder: Number(p.reorder || 0)
    }));

  return {
    slug: shop ? shop.slug : (db.settings?.shopSlug || 'smartduka'),
    shopName: shop ? shop.name : (db.settings?.storeName || 'Smart Duka'),
    systemName: shop ? shop.name : (db.settings?.storeName || 'Smart Duka'),
    phone: shop?.settings?.phone || db.settings?.phone || '',
    updatedAt: Date.now(),
    products
  };
}

function addAudit(db, action, entity, details, user = 'system', shopId = null) {
  db.audit.unshift({
    id: uuid(),
    action,
    entity,
    details,
    user,
    time: Date.now(),
    shopId: shopId || (db.shops && db.shops[0] ? db.shops[0].id : null)
  });
}

function getProductVelocity(db, days = 30, shopId = null) {
  const cutoff = Date.now() - days * 86400000;
  const map = new Map();

  for (const product of db.products || []) {
    if (shopId && String(product.shopId || '') !== String(shopId)) continue;
    map.set(product.id, { id: product.id, name: product.name, qty: 0, revenue: 0, stock: Number(product.stock || 0), category: product.category || 'General' });
  }

  for (const sale of db.sales || []) {
    if (shopId && String(sale.shopId || '') !== String(shopId)) continue;
    if (!sale || Number(sale.time) < cutoff) continue;
    for (const item of sale.items || []) {
      const product = map.get(item.productId || item.id);
      if (!product) continue;
      product.qty += Number(item.qty || 0);
      product.revenue += Number(item.qty || 0) * Number(item.price || 0);
    }
  }

  const list = [...map.values()].sort((a, b) => b.qty - a.qty);
  return {
    frequent: list.slice(0, 5),
    slow: [...list].sort((a, b) => a.qty - b.qty).slice(0, 5),
    total: list
  };
}

function sendJson(res, data, status = 200) {
  res.status(status).json(data);
}

app.get('/api/health', async (_, res) => {
  const data = await loadStore();
  sendJson(res, { ok: true, shop: data.settings.storeName || 'Smart Duka' });
});

app.get('/api/shops', async (_, res) => {
  const db = await loadStore();
  sendJson(res, {
    ok: true,
    shops: (db.shops || []).map((shop) => ({
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      status: shop.status,
      createdAt: shop.createdAt,
      settings: shop.settings || {}
    }))
  });
});

app.post('/api/shops', async (req, res) => {
  const db = await loadStore();
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name || 'shop');

  if (!name) return sendJson(res, { error: 'Shop name required' }, 400);
  if ((db.shops || []).some((shop) => shop.slug === slug)) {
    return sendJson(res, { error: 'Shop slug already exists' }, 409);
  }

  const shop = {
    id: `shop-${uuid()}`,
    name,
    slug,
    status: 'ACTIVE',
    createdAt: Date.now(),
    settings: {
      ...getShopDefaultSettings(name),
      remotePin: String(body.remotePin || '1234'),
      phone: body.phone || '',
      address: body.address || '',
      shopSlug: slug,
      storeName: name
    }
  };

  db.shops.push(shop);
  const defaultAdmin = {
    id: `user-${uuid()}`,
    shopId: shop.id,
    name: 'Shop Admin',
    username: `admin-${slug}`,
    password: hashPassword(String(body.password || 'Admin123!')),
    role: 'ADMIN',
    status: 'ACTIVE'
  };

  db.users.push(defaultAdmin);
  addAudit(db, 'SHOP_CREATED', 'shop', `${shop.name} (${shop.slug})`, 'system', shop.id);
  await saveStore(db);

  sendJson(res, { ok: true, shop, user: { username: defaultAdmin.username, role: defaultAdmin.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const db = await loadStore();
  const shopId = resolveShopId(db, req);

  const user = (db.users || []).find((row) => {
    const matchesUsername = row.username.toLowerCase() === String(username || '').toLowerCase();
    const matchesShop = !shopId || !row.shopId || String(row.shopId) === String(shopId);
    return matchesUsername && matchesShop;
  });

  if (!user) return sendJson(res, { error: 'Invalid username or password' }, 401);

  const provided = hashPassword(String(password || ''));
  if (user.password !== provided) return sendJson(res, { error: 'Invalid username or password' }, 401);

  const shop = (db.shops || []).find((entry) => String(entry.id) === String(user.shopId || shopId)) || (db.shops || [])[0];
  addAudit(db, 'LOGIN', 'user', `User ${user.username} signed in`, user.username, user.shopId || shop?.id || null);
  await saveStore(db);

  sendJson(res, {
    ok: true,
    user: { id: user.id, name: user.name, username: user.username, role: user.role, status: user.status, shopId: user.shopId || shop?.id || null },
    shop: shop ? { id: shop.id, name: shop.name, slug: shop.slug } : null
  });
});

app.get('/api/products', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const products = (db.products || []).filter((p) => {
    if (!shopId) return true;
    return String(p.shopId || db.settings?.shopSlug || 'shop-default') === String(shopId);
  });
  sendJson(res, { ok: true, products });
});

app.post('/api/products', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const p = req.body || {};
  if (!p.name) return sendJson(res, { error: 'Product name required' }, 400);

  const product = normalizeProductRecord({
    id: p.id || `p-${Date.now()}`,
    sku: p.sku || `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: p.name,
    category: p.category || 'General',
    stock: Number(p.stock || 0),
    cost: Number(p.cost || 0),
    price: Number(p.price || 0),
    reorder: Number(p.reorder || 5),
    unit: p.unit || 'piece',
    barcode: p.barcode || '',
    sellOnline: !!p.sellOnline,
    status: 'ACTIVE',
    imageData: p.imageData || '',
    createdAt: getToday(),
    shopId: p.shopId || shopId || (db.shops || [])[0]?.id
  }, shopId || (db.shops || [])[0]?.id);

  const idx = (db.products || []).findIndex((row) => row.id === product.id && String(row.shopId || '') === String(product.shopId || ''));
  if (idx >= 0) db.products[idx] = product;
  else db.products.push(product);

  addAudit(db, 'PRODUCT_SAVED', 'product', product.name, 'admin', product.shopId);
  db.catalog = buildCatalog(db, product.shopId);
  await saveStore(db);
  sendJson(res, { ok: true, product });
});

app.post('/api/stock/adjust', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const { productId, delta, reason = 'Adjustment' } = req.body || {};
  const product = (db.products || []).find((p) => String(p.id) === String(productId) && String(p.shopId || '') === String(shopId));
  if (!product) return sendJson(res, { error: 'Product not found' }, 404);
  const prev = Number(product.stock || 0);
  product.stock = Math.max(0, prev + Number(delta || 0));
  db.stockMovements.unshift({
    id: uuid(),
    shopId,
    productId,
    name: product.name,
    delta: Number(delta || 0),
    before: prev,
    after: product.stock,
    reason,
    time: Date.now()
  });
  addAudit(db, 'STOCK_ADJUSTED', 'stock', `${product.name}: ${reason}`, 'admin', shopId);
  await saveStore(db);
  sendJson(res, { ok: true, product });
});

app.post('/api/sales', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const { items = [], cashier = 'Cashier', paymentMethod = 'CASH', customerName = '', customerPhone = '' } = req.body || {};

  if (!Array.isArray(items) || !items.length) return sendJson(res, { error: 'No sale items' }, 400);

  let total = 0;
  const saleItems = [];

  for (const line of items) {
    const product = (db.products || []).find((p) => String(p.id) === String(line.productId || line.id || '') && String(p.shopId || '') === String(shopId));
    if (!product) return sendJson(res, { error: `Product not found: ${line.productId || line.id || ''}` }, 400);
    const qty = Number(line.qty || 0);
    if (qty <= 0) return sendJson(res, { error: `Invalid quantity for ${product.name}` }, 400);
    if (Number(product.stock || 0) < qty) return sendJson(res, { error: `${product.name} is out of stock` }, 409);
    product.stock = Number(product.stock || 0) - qty;
    total += Number(product.price || 0) * qty;
    saleItems.push({ productId: product.id, id: product.id, name: product.name, qty, price: Number(product.price || 0), cost: Number(product.cost || 0), unit: product.unit || 'piece' });
  }

  const sale = {
    id: uuid(),
    shopId,
    number: `SD-${Date.now().toString().slice(-7)}`,
    time: Date.now(),
    cashier,
    paymentMethod,
    customerName,
    customerPhone,
    status: 'PAID',
    total,
    items: saleItems,
    profit: saleItems.reduce((sum, i) => sum + (Number(i.price || 0) - Number(i.cost || 0)) * Number(i.qty || 0), 0)
  };

  db.sales.unshift(sale);
  addAudit(db, 'SALE_CREATED', 'sale', sale.number, cashier, shopId);
  db.catalog = buildCatalog(db, shopId);
  await saveStore(db);
  sendJson(res, { ok: true, sale });
});

app.get('/api/analytics', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const velocity = getProductVelocity(db, 30, shopId);
  const lowStock = (db.products || []).filter((p) => String(p.shopId || '') === String(shopId) && Number(p.stock || 0) <= Number(p.reorder || 0));
  const salesToday = (db.sales || []).filter((s) => String(s.shopId || '') === String(shopId) && new Date(Number(s.time)).toDateString() === new Date().toDateString());
  const totalRevenue = salesToday.reduce((sum, s) => sum + Number(s.total || 0), 0);
  sendJson(res, {
    ok: true,
    analytics: {
      lowStock,
      frequentProducts: velocity.frequent,
      slowProducts: velocity.slow,
      totalRevenue,
      todaySales: salesToday.length
    }
  });
});

app.get('/api/admin/snapshot', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const { slug, pin } = req.query || {};

  const shop = findShopByTarget(db.shops || [], slug || shopId);
  if (!shop) return sendJson(res, { error: 'shop not found' }, 404);
  if (String(shop.settings?.remotePin || '1234') !== String(pin || '')) return sendJson(res, { error: 'Invalid remote credentials' }, 403);

  sendJson(res, {
    ok: true,
    shop: shop.name,
    products: (db.products || []).filter((product) => String(product.shopId || '') === String(shop.id)),
    sales: (db.sales || []).filter((sale) => String(sale.shopId || '') === String(shop.id)).slice(0, 100),
    audits: (db.audit || []).filter((entry) => String(entry.shopId || '') === String(shop.id)).slice(0, 50),
    analytics: getProductVelocity(db, 30, shop.id)
  });
});

app.get('/api/catalog/:slug', async (req, res) => {
  const db = await loadStore();
  const slug = String(req.params.slug || '').toLowerCase();
  if (!slug) return sendJson(res, { error: 'shop required' }, 400);
  const shop = (db.shops || []).find((entry) => String(entry.slug || '').toLowerCase() === slug);
  if (!shop) return sendJson(res, { error: 'Shop not found' }, 404);
  const catalog = buildCatalog(db, shop.id);
  sendJson(res, { ok: true, catalog });
});

app.post('/api/orders', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const { slug, customer, items, paymentMethod = 'STK', location } = req.body || {};
  const shop = findShopByTarget(db.shops || [], slug || shopId);
  if (!shop) return sendJson(res, { error: 'Invalid shop slug' }, 400);
  if (!Array.isArray(items) || !items.length) return sendJson(res, { error: 'Cart is empty' }, 400);

  let total = 0;
  const mappedItems = [];

  for (const item of items) {
    const product = (db.products || []).find((p) => String(p.id) === String(item.id) && String(p.shopId || '') === String(shop.id));
    if (!product) return sendJson(res, { error: `Bad product: ${item.id}` }, 400);
    const qty = Number(item.qty || 0);
    if (qty <= 0) return sendJson(res, { error: 'Invalid quantity' }, 400);
    if (Number(product.stock || 0) < qty) return sendJson(res, { error: `${product.name} does not have enough stock` }, 409);
    total += Number(product.price || 0) * qty;
    mappedItems.push({ productId: product.id, name: product.name, qty, price: Number(product.price || 0) });
  }

  const order = {
    id: uuid(),
    shopId: shop.id,
    slug: shop.slug,
    customer: customer || { name: 'Guest', phone: '' },
    location: location || null,
    items: mappedItems,
    total,
    paymentMethod,
    status: 'PENDING',
    createdAt: Date.now()
  };

  db.orders.unshift(order);
  addAudit(db, 'ONLINE_ORDER', 'order', `${order.id} / ${customer?.name || 'Guest'}`, 'shop', shop.id);
  await saveStore(db);
  sendJson(res, { ok: true, order });
});

app.post('/api/mpesa/stk', async (req, res) => {
  const env = process.env.MPESA_ENV || 'sandbox';
  const consumerKey = process.env.MPESA_CONSUMER_KEY || '';
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
  const shortcode = process.env.MPESA_SHORTCODE || '';
  const passkey = process.env.MPESA_PASSKEY || '';
  if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
    return sendJson(res, { error: 'Daraja credentials not configured on this server' }, 503);
  }

  const { phone, amount, saleId, slug = 'smartduka' } = req.body || {};
  if (!phone || !amount) return sendJson(res, { error: 'Phone and amount are required' }, 400);

  const base = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    const tokenRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) throw new Error(tokenJson.error_description || 'Failed to get M-Pesa token');

    const requestBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
      Amount: Number(amount),
      PartyA: phone.replace(/\D/g, ''),
      PartyB: shortcode,
      PhoneNumber: phone.replace(/\D/g, ''),
      CallBackURL: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/mpesa/callback?token=${process.env.MPESA_CALLBACK_TOKEN || 'demo'}`,
      AccountReference: String(slug || 'smartduka').slice(0, 12),
      TransactionDesc: 'Smart Duka sale'
    };

    const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const stkJson = await stkRes.json();
    if (!stkJson.CheckoutRequestID) {
      return sendJson(res, { error: stkJson.errorMessage || 'STK request failed', details: stkJson }, 400);
    }

    const db = await loadStore();
    const shop = findShopByTarget(db.shops || [], slug || 'smartduka');
    db.mpesaCallbacks.push({
      id: uuid(),
      shopId: shop?.id || null,
      checkoutRequestId: stkJson.CheckoutRequestID,
      saleId: saleId || null,
      slug,
      phone,
      amount: Number(amount),
      status: 'PENDING',
      createdAt: Date.now()
    });
    await saveStore(db);

    sendJson(res, { ok: true, checkoutRequestId: stkJson.CheckoutRequestID, customerMessage: stkJson.CustomerMessage || 'Check your phone' });
  } catch (error) {
    sendJson(res, { error: error.message || 'M-Pesa request failed' }, 500);
  }
});

app.post('/api/mpesa/callback', async (req, res) => {
  const token = String(req.query.token || '');
  const expected = String(process.env.MPESA_CALLBACK_TOKEN || 'demo');
  if (expected && token !== expected) {
    return sendJson(res, { ResultCode: 1, ResultDesc: 'Rejected: invalid callback token' }, 403);
  }

  const body = req.body || {};
  const stk = body.Body?.stkCallback || body.stkCallback || {};
  const checkoutRequestId = String(stk.CheckoutRequestID || body.CheckoutRequestID || '');
  const resultCode = String(stk.ResultCode ?? body.ResultCode ?? '');
  const receipt = String(stk.CallbackMetadata?.Item?.find((i) => /receipt/i.test(i.Name || ''))?.Value || '');

  const db = await loadStore();
  const callback = (db.mpesaCallbacks || []).find((c) => c.checkoutRequestId === checkoutRequestId);
  if (callback) {
    callback.status = resultCode === '0' ? 'PAID' : 'FAILED';
    callback.resultCode = resultCode;
    callback.receipt = receipt;
    callback.updatedAt = Date.now();
  }

  if (callback?.saleId) {
    const order = (db.orders || []).find((o) => String(o.id) === String(callback.saleId) && String(o.shopId || '') === String(callback.shopId || ''));
    if (order) {
      order.status = resultCode === '0' ? 'PAID' : 'FAILED';
      order.mpesaReceipt = receipt || order.mpesaReceipt || '';
      order.callbackResultCode = resultCode;
    }
  }

  addAudit(db, 'MPESA_CALLBACK', 'payment', `Checkout ${checkoutRequestId} -> ${resultCode}`, 'system', callback?.shopId || null);
  await saveStore(db);

  sendJson(res, { ResultCode: 0, ResultDesc: 'Accepted' });
});

app.get('/api/mpesa/status/:checkoutRequestId', async (req, res) => {
  const { checkoutRequestId } = req.params;
  const db = await loadStore();
  const callback = (db.mpesaCallbacks || []).find((c) => c.checkoutRequestId === checkoutRequestId);
  if (!callback) return sendJson(res, { ok: false, status: 'PENDING' }, 404);
  sendJson(res, {
    ok: true,
    status: callback.status || 'PENDING',
    paid: callback.status === 'PAID',
    receipt: callback.receipt || '',
    resultCode: callback.resultCode || '',
    checkoutRequestId
  });
});

app.post('/api/settings', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const body = req.body || {};
  const shop = (db.shops || []).find((entry) => String(entry.id) === String(shopId)) || (db.shops || [])[0];
  if (!shop) return sendJson(res, { error: 'Shop not found' }, 404);

  shop.name = body.storeName || shop.name;
  shop.settings = {
    ...shop.settings,
    storeName: body.storeName || shop.name,
    shopSlug: slugify(body.shopSlug || shop.slug || shop.settings?.shopSlug || 'smartduka'),
    remotePin: String(body.remotePin || shop.settings?.remotePin || '1234'),
    phone: body.phone || shop.settings?.phone || '',
    address: body.address || shop.settings?.address || '',
    mpesaShortcode: body.mpesaShortcode || shop.settings?.mpesaShortcode || '',
    mpesaEnv: body.mpesaEnv || shop.settings?.mpesaEnv || 'sandbox',
    mpesaTransactionType: body.mpesaTransactionType || shop.settings?.mpesaTransactionType || 'CustomerPayBillOnline'
  };
  shop.slug = slugify(shop.settings.shopSlug || shop.slug);
  db.settings = buildLegacySettingsFromShop(shop);
  db.catalog = buildCatalog(db, shop.id);
  addAudit(db, 'SETTINGS_UPDATED', 'settings', 'Settings updated', 'admin', shop.id);
  await saveStore(db);
  sendJson(res, { ok: true, settings: shop.settings });
});

app.get('/api/bootstrap', async (req, res) => {
  const db = await loadStore();
  const shopId = resolveShopId(db, req);
  const shop = (db.shops || []).find((entry) => String(entry.id) === String(shopId)) || (db.shops || [])[0];
  sendJson(res, {
    ok: true,
    settings: shop ? shop.settings : db.settings,
    shops: (db.shops || []).map((entry) => ({ id: entry.id, name: entry.name, slug: entry.slug, status: entry.status })),
    users: (db.users || []).filter((u) => !shopId || !u.shopId || String(u.shopId) === String(shopId)),
    products: (db.products || []).filter((p) => !shopId || String(p.shopId || '') === String(shopId)),
    sales: (db.sales || []).filter((s) => !shopId || String(s.shopId || '') === String(shopId)),
    analytics: getProductVelocity(db, 30, shopId)
  });
});

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  await ensureStore();
  app.listen(PORT, () => console.log(`Smart Duka server running on http://localhost:${PORT}`));
}

start();
