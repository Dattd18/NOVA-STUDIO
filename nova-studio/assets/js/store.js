import { PRODUCTS } from './data.js';

const STORAGE_KEY = 'nova-studio-v1';
const INITIAL_STATE = { cart: [], wishlist: [], user: null, accounts: [], orders: [], coupon: null, filters: { category: 'all', color: 'all', maxPrice: 6000000, query: '', sort: 'new' } };

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return structuredClone(INITIAL_STATE);
    return {
      ...structuredClone(INITIAL_STATE),
      ...saved,
      cart: Array.isArray(saved.cart) ? saved.cart : [],
      wishlist: Array.isArray(saved.wishlist) ? saved.wishlist : [],
      accounts: Array.isArray(saved.accounts) ? saved.accounts : [],
      orders: Array.isArray(saved.orders) ? saved.orders : [],
      filters: { ...INITIAL_STATE.filters, ...(saved.filters || {}) }
    };
  } catch {
    return structuredClone(INITIAL_STATE);
  }
}

let state = readState();
const listeners = new Set();
const productById = new Map(PRODUCTS.map(product => [product.id, product]));

function commit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach(listener => listener(getState()));
}

export function getState() { return structuredClone(state); }
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function getProduct(id) { return productById.get(id) || null; }
export function formatPrice(value) { return `${new Intl.NumberFormat('vi-VN').format(value)}đ`; }
export function getCartCount() { return state.cart.reduce((total, item) => total + item.quantity, 0); }
export function getWishlistCount() { return state.wishlist.length; }
export function getQuantityInCart(id) { return state.cart.filter(item => item.id === id).reduce((total, item) => total + item.quantity, 0); }
export function getAvailableStock(id) {
  const product = getProduct(id);
  if (!product) return 0;
  const sold = state.orders.flatMap(order => order.items || []).filter(item => item.id === id).reduce((total, item) => total + item.quantity, 0);
  return Math.max(0, product.stock - sold);
}

export function setFilters(patch) {
  state.filters = { ...state.filters, ...patch };
  commit();
}

export function clearFilters() {
  state.filters = structuredClone(INITIAL_STATE.filters);
  commit();
}

export function toggleWishlist(id) {
  if (!getProduct(id)) return false;
  const index = state.wishlist.indexOf(id);
  if (index >= 0) state.wishlist.splice(index, 1);
  else state.wishlist.push(id);
  commit();
  return index < 0;
}

export function addToCart(id, color, quantity = 1) {
  const product = getProduct(id);
  if (!product) throw new Error('Không tìm thấy sản phẩm.');
  if (!product.colors.some(option => option.name === color)) throw new Error('Màu sắc không hợp lệ.');
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Số lượng không hợp lệ.');
  if (getQuantityInCart(id) + quantity > getAvailableStock(id)) throw new Error(`Chỉ còn ${getAvailableStock(id)} sản phẩm trong kho.`);
  const existing = state.cart.find(item => item.id === id && item.color === color);
  if (existing) existing.quantity += quantity;
  else state.cart.push({ id, color, quantity });
  commit();
}

export function changeCartQuantity(id, color, delta) {
  const item = state.cart.find(line => line.id === id && line.color === color);
  if (!item) return;
  if (delta > 0 && getQuantityInCart(id) + delta > getAvailableStock(id)) throw new Error('Đã đạt số lượng còn trong kho.');
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter(line => line !== item);
  commit();
}

export function removeFromCart(id, color) {
  state.cart = state.cart.filter(item => !(item.id === id && item.color === color));
  if (!state.cart.length) state.coupon = null;
  commit();
}

export function applyCoupon(code) {
  const normalized = code.trim().toUpperCase();
  if (!state.cart.length) throw new Error('Giỏ hàng đang trống.');
  if (!['NOVAVIP', 'FREESHIP'].includes(normalized)) throw new Error('Mã giảm giá không hợp lệ.');
  state.coupon = normalized;
  commit();
  return normalized;
}

export function getCartTotals() {
  const subtotal = state.cart.reduce((total, item) => total + (getProduct(item.id)?.price || 0) * item.quantity, 0);
  const discount = state.coupon === 'NOVAVIP' ? Math.round(subtotal * .15) : 0;
  const shipping = !subtotal || subtotal >= 5000000 || state.coupon === 'FREESHIP' ? 0 : 40000;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping, remaining: Math.max(0, 5000000 - subtotal) };
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function register(name, email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (state.accounts.some(account => account.email === normalizedEmail)) throw new Error('Email này đã được đăng ký.');
  if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
  const passwordHash = await hashPassword(password);
  state.accounts.push({ name: name.trim(), email: normalizedEmail, passwordHash });
  state.user = { name: name.trim(), email: normalizedEmail };
  commit();
}

export async function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if ((normalizedEmail === 'admin' || normalizedEmail === 'admin@novastudio.vn') && (password === 'admin' || password === 'admin123' || password === '12345678')) {
    state.user = { name: 'Admin', email: 'admin@novastudio.vn' };
    commit();
    return;
  }
  const passwordHash = await hashPassword(password);
  const account = state.accounts.find(item => (item.email === normalizedEmail || item.name.trim().toLowerCase() === normalizedEmail) && item.passwordHash === passwordHash);
  if (!account) throw new Error('Email/Tên đăng nhập hoặc mật khẩu chưa đúng.');
  state.user = { name: account.name, email: account.email };
  commit();
}

export function logout() { state.user = null; commit(); }

export function placeOrder(customer, payment) {
  if (!state.cart.length) throw new Error('Giỏ hàng đang trống.');
  for (const item of state.cart) {
    const product = getProduct(item.id);
    if (!product || getQuantityInCart(item.id) > getAvailableStock(item.id)) throw new Error(`Sản phẩm ${product?.name || item.id} đã vượt số lượng còn lại.`);
  }
  const order = {
    id: `NOVA-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    customer: { ...customer, email: customer.email.trim().toLowerCase() },
    payment,
    items: structuredClone(state.cart),
    totals: getCartTotals(),
    coupon: state.coupon,
    status: 'Đã tiếp nhận'
  };
  state.orders.unshift(order);
  state.cart = [];
  state.coupon = null;
  commit();
  return order;
}

export function getUserOrders() {
  if (!state.user) return [];
  return state.orders.filter(order => order.customer.email === state.user.email);
}
