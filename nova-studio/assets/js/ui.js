import { PRODUCTS } from './data.js';
import { getState, subscribe, getProduct, formatPrice, getCartCount, getWishlistCount, getQuantityInCart, getAvailableStock, setFilters, clearFilters, toggleWishlist, addToCart, changeCartQuantity, removeFromCart, applyCoupon, getCartTotals, register, login, logout, placeOrder, getUserOrders } from './store.js';

const PAGE = document.body.dataset.page;
const CATEGORIES = ['all', 'Tote', 'Crossbody', 'Shoulder', 'Mini', 'Clutch'];
const COLORS = [...new Map(PRODUCTS.flatMap(product => product.colors).map(color => [color.name, color])).values()];
const $ = selector => document.querySelector(selector);
let productImage = 0;
let productColor = null;
let productQuantity = 1;
let authMode = PAGE === 'register' ? 'register' : 'login';
let filtersOpen = false;
let confirmedOrder = null;
let searchTimer = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function normalizeText(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function toast(message, error = false) {
  const element = document.createElement('div');
  element.className = `toast${error ? ' error' : ''}`;
  element.textContent = message;
  $('#toast-stack').append(element);
  setTimeout(() => element.remove(), 4500);
}

function headerMarkup() {
  const shopCurrent = ['shop', 'product'].includes(PAGE);
  return `<div class="site-announcement">Miễn phí vận chuyển cho đơn hàng từ 5.000.000đ &nbsp; · &nbsp; Mã NOVAVIP giảm 15%</div>
    <header class="site-header"><div class="header-inner container">
      <button class="menu-toggle" id="menu-toggle" aria-label="Mở menu" aria-controls="mobile-nav" aria-expanded="false">☰</button>
      <a class="site-logo" href="./index.html" aria-label="NOVA STUDIO, trang chủ">NOVA<span>STUDIO</span></a>
      <nav class="desktop-nav" aria-label="Điều hướng chính">
        <a href="./index.html" class="${PAGE === 'home' ? 'current' : ''}">Trang chủ</a>
        <div class="nav-dropdown ${shopCurrent ? 'current' : ''}"><a href="./shop.html" aria-haspopup="true">Bộ sưu tập</a><div class="nav-menu"><strong>Mua sắm theo kiểu dáng</strong><a href="./shop.html">Tất cả sản phẩm</a><a href="./shop.html?category=Tote">Túi Tote</a><a href="./shop.html?category=Crossbody">Túi Crossbody</a><a href="./shop.html?category=Shoulder">Túi Shoulder</a><a href="./shop.html?category=Mini">Túi Mini</a><a href="./shop.html?category=Clutch">Túi Clutch</a></div></div>
        <a href="./shop.html?sort=new">Hàng mới</a><a href="./about.html" class="${PAGE === 'about' ? 'current' : ''}">Về NOVA</a>
      </nav>
      <div class="header-actions"><button class="header-icon" id="search-toggle" aria-label="Tìm kiếm" aria-expanded="false" aria-controls="search-panel"><span class="search-icon" aria-hidden="true"></span></button><a class="header-icon" href="${getState().user ? './account.html' : './login.html'}" aria-label="Tài khoản" ${['account', 'login', 'register'].includes(PAGE) ? 'aria-current="page"' : ''}><span class="person-icon" aria-hidden="true"></span></a><a class="header-icon" href="./wishlist.html" aria-label="Yêu thích" ${PAGE === 'wishlist' ? 'aria-current="page"' : ''}>♡<span class="count" id="wishlist-count" hidden>0</span></a><a class="header-icon" href="./cart.html" aria-label="Giỏ hàng" ${PAGE === 'cart' ? 'aria-current="page"' : ''}><span class="bag-icon" aria-hidden="true"></span><span class="count" id="cart-count" hidden>0</span></a></div>
    </div><nav class="mobile-nav" id="mobile-nav" aria-label="Điều hướng di động"><a href="./index.html">Trang chủ</a><a href="./shop.html" class="mobile-all">Tất cả sản phẩm</a><strong>KIỂU DÁNG</strong><a href="./shop.html?category=Tote">Tote</a><a href="./shop.html?category=Crossbody">Crossbody</a><a href="./shop.html?category=Shoulder">Shoulder</a><a href="./shop.html?category=Mini">Mini</a><a href="./shop.html?category=Clutch">Clutch</a><strong>NOVA STUDIO</strong><a href="./about.html">Về chúng tôi</a><a href="${getState().user ? './account.html' : './login.html'}">Tài khoản</a></nav>
    <div class="search-panel" id="search-panel" hidden><form class="container" id="search-form"><label for="site-search">Tìm kiếm sản phẩm</label><input id="site-search" type="search" name="q" placeholder="Tên túi, kiểu dáng, chất liệu..." autocomplete="off"><button type="submit">Tìm kiếm ↗</button></form></div></header>`;
}

function footerMarkup() {
  return `<footer class="site-footer">
    <div class="footer-feature"><div class="container footer-feature-inner"><div><p class="eyebrow">THE NOVA WORLD</p><h2>Mỗi ngày một cách <em>mang theo vẻ đẹp.</em></h2><p>Khám phá những thiết kế được chọn cho nhịp sống của riêng bạn.</p></div><a class="button button-light" href="./shop.html">Khám phá bộ sưu tập <span aria-hidden="true">↗</span></a></div></div>
    <div class="footer-benefits container" aria-label="Thông tin mua sắm"><div><span class="benefit-index">01</span><div><strong>Miễn phí vận chuyển</strong><p>Với đơn hàng từ 5.000.000đ</p></div></div><div><span class="benefit-index">02</span><div><strong>Chọn theo phong cách</strong><p>Tìm kiếm theo kiểu dáng, màu và giá</p></div></div><div><span class="benefit-index">03</span><div><strong>Quản lý đơn hàng</strong><p>Xem lại lịch sử trong tài khoản</p></div></div></div>
    <div class="footer-main container"><div class="footer-brand"><a class="site-logo" href="./index.html" aria-label="NOVA STUDIO, trang chủ">NOVA<span>STUDIO</span></a><p>Túi xách cho những khoảnh khắc bạn muốn giữ lại. Thiết kế tinh tế, dễ đồng hành cùng mỗi ngày.</p><a class="footer-email" href="mailto:hello@novastudio.vn">hello@novastudio.vn <span aria-hidden="true">↗</span></a></div><nav class="footer-column" aria-label="Danh mục sản phẩm"><h2>Sản phẩm</h2><a href="./shop.html">Tất cả sản phẩm</a><a href="./shop.html?category=Tote">Túi Tote</a><a href="./shop.html?category=Crossbody">Túi Crossbody</a><a href="./shop.html?category=Shoulder">Túi Shoulder</a><a href="./shop.html?category=Mini">Túi Mini</a><a href="./shop.html?category=Clutch">Túi Clutch</a></nav><nav class="footer-column" aria-label="Hỗ trợ khách hàng"><h2>Hỗ trợ mua hàng</h2><a href="./support.html#guide">Hướng dẫn mua hàng</a><a href="./support.html#shipping">Vận chuyển & thanh toán</a><a href="./support.html#orders">Theo dõi đơn hàng</a><a href="./support.html#faq">Câu hỏi thường gặp</a></nav><nav class="footer-column" aria-label="Thông tin NOVA STUDIO"><h2>Về NOVA</h2><a href="./about.html">Câu chuyện thương hiệu</a><a href="./account.html">Tài khoản của tôi</a><a href="./wishlist.html">Danh sách yêu thích</a><a href="./cart.html">Giỏ hàng</a></nav></div>
    <div class="footer-bottom container"><span>© 2026 NOVA STUDIO. All rights reserved.</span><div><a href="./support.html">Trung tâm hỗ trợ</a><a href="./about.html">Về chúng tôi</a><span>Designed with intention.</span></div></div>
  </footer>`;
}

function renderBadges() {
  const cartCount = getCartCount();
  const wishlistCount = getWishlistCount();
  $('#cart-count').textContent = cartCount;
  $('#cart-count').hidden = cartCount === 0;
  $('#wishlist-count').textContent = wishlistCount;
  $('#wishlist-count').hidden = wishlistCount === 0;
}

function priceMarkup(product) {
  return `<div class="price-line"><span>${formatPrice(product.price)}</span>${product.originalPrice ? `<del>${formatPrice(product.originalPrice)}</del>` : ''}</div>`;
}

function productCard(product) {
  const saved = getState().wishlist.includes(product.id);
  const label = product.isNew ? 'Mới' : product.originalPrice ? 'Ưu đãi' : product.isBestSeller ? 'Bán chạy' : '';
  return `<article class="product-card"><div class="product-media"><a href="./product.html?id=${product.id}" aria-label="Xem ${escapeHtml(product.name)}"><img class="main" src="${product.images[0]}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async"><img class="alt" src="${product.images[1]}" alt="" loading="lazy" decoding="async"></a>${label ? `<span class="product-tag">${label}</span>` : ''}<button class="heart-button ${saved ? 'active' : ''}" data-action="favorite" data-id="${product.id}" aria-label="${saved ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} ${escapeHtml(product.name)}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button><button class="quick-button" data-action="quick-add" data-id="${product.id}">Thêm nhanh <span aria-hidden="true">＋</span></button></div><div class="product-info"><p>${product.category}</p><a href="./product.html?id=${product.id}">${escapeHtml(product.name)}</a>${priceMarkup(product)}<div class="mini-swatches" aria-label="${product.colors.length} màu sắc">${product.colors.map(color => `<span title="${escapeHtml(color.name)}" style="--color:${color.hex}"></span>`).join('')}</div></div></article>`;
}

function renderHome() {
  $('#home-new').innerHTML = [...PRODUCTS].filter(product => product.isNew).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4).map(productCard).join('');
  $('#home-best').innerHTML = [...PRODUCTS].filter(product => product.isBestSeller).sort((a, b) => b.rating - a.rating || b.id.localeCompare(a.id)).slice(0, 4).map(productCard).join('');
}

function readShopUrl() {
  const params = new URLSearchParams(location.search);
  const category = params.get('category');
  const color = params.get('color');
  const sort = params.get('sort');
  const max = Number(params.get('max'));
  setFilters({
    category: CATEGORIES.includes(category) ? category : 'all',
    color: COLORS.some(option => option.name === color) ? color : 'all',
    maxPrice: Number.isFinite(max) && max >= 2500000 && max <= 6000000 ? max : 6000000,
    query: params.get('q') || '',
    sort: ['new', 'best', 'price-asc', 'price-desc'].includes(sort) ? sort : 'new'
  });
}

function updateShopUrl(filters) {
  const params = new URLSearchParams();
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.color !== 'all') params.set('color', filters.color);
  if (filters.maxPrice < 6000000) params.set('max', filters.maxPrice);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.sort !== 'new') params.set('sort', filters.sort);
  history.replaceState(null, '', `./shop.html${params.size ? `?${params}` : ''}`);
}

function visibleProducts(filters) {
  const term = normalizeText(filters.query.trim());
  const results = PRODUCTS.filter(product =>
    (filters.category === 'all' || product.category === filters.category) &&
    (filters.color === 'all' || product.colors.some(color => color.name === filters.color)) &&
    product.price <= Number(filters.maxPrice) &&
    (!term || normalizeText(`${product.name} ${product.category} ${product.material} ${product.colors.map(color => color.name).join(' ')}`).includes(term))
  );
  const newest = (a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2));
  if (filters.sort === 'best') results.sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller) || b.rating - a.rating || newest(a, b));
  else if (filters.sort === 'price-asc') results.sort((a, b) => a.price - b.price || newest(a, b));
  else if (filters.sort === 'price-desc') results.sort((a, b) => b.price - a.price || newest(a, b));
  else results.sort((a, b) => Number(b.isNew) - Number(a.isNew) || newest(a, b));
  return results;
}

function renderShop() {
  const { filters } = getState();
  const products = visibleProducts(filters);
  updateShopUrl(filters);
  $('#shop-categories').innerHTML = CATEGORIES.map(category => `<button type="button" data-action="category" data-value="${category}" class="${filters.category === category ? 'selected' : ''}" aria-pressed="${filters.category === category}">${category === 'all' ? 'Tất cả' : category}</button>`).join('');
  $('#category-filter').innerHTML = CATEGORIES.map(category => `<label><input type="radio" name="category" value="${category}" ${filters.category === category ? 'checked' : ''}>${category === 'all' ? 'Tất cả' : category}</label>`).join('');
  $('#color-filter').innerHTML = `<button type="button" data-action="color" data-value="all" class="${filters.color === 'all' ? 'selected' : ''}" aria-label="Tất cả màu" aria-pressed="${filters.color === 'all'}"><span style="--color:conic-gradient(#181818 0 25%,#c19a6b 25% 50%,#f0ead6 50% 75%,#6b1c23 75%)"></span></button>` + COLORS.map(color => `<button type="button" data-action="color" data-value="${escapeHtml(color.name)}" class="${filters.color === color.name ? 'selected' : ''}" aria-label="Màu ${escapeHtml(color.name)}" aria-pressed="${filters.color === color.name}" title="${escapeHtml(color.name)}"><span style="--color:${color.hex}"></span></button>`).join('');
  $('#price-filter').value = filters.maxPrice;
  $('#price-output').textContent = formatPrice(filters.maxPrice);
  $('#shop-sort').value = filters.sort;
  $('#shop-count').textContent = `${products.length} sản phẩm`;
  $('#shop-grid').innerHTML = products.map(productCard).join('');
  $('#shop-grid').hidden = products.length === 0;
  $('#shop-empty').hidden = products.length !== 0;
  $('#shop-filter').classList.toggle('open', filtersOpen);
  $('#filter-toggle').setAttribute('aria-expanded', String(filtersOpen));
  if (!$('#search-panel').hidden && document.activeElement !== $('#site-search')) $('#site-search').value = filters.query;
}

function productFromUrl() {
  return getProduct(new URLSearchParams(location.search).get('id'));
}

function renderProduct() {
  const product = productFromUrl();
  if (!product) {
    $('#product-breadcrumbs').innerHTML = `<a href="./index.html">Trang chủ</a><span>/</span><a href="./shop.html">Bộ sưu tập</a><span>/</span><span>Không tìm thấy</span>`;
    $('#product-content').innerHTML = `<div class="empty-page"><h2>Không tìm thấy sản phẩm.</h2><a class="button button-dark" href="./shop.html">Xem bộ sưu tập <span>↗</span></a></div>`;
    $('#related-products').innerHTML = '';
    return;
  }
  document.title = `${product.name} | NOVA STUDIO`;
  if (!productColor || !product.colors.some(color => color.name === productColor)) productColor = product.colors[0].name;
  const remaining = getAvailableStock(product.id) - getQuantityInCart(product.id);
  const saved = getState().wishlist.includes(product.id);
  $('#product-breadcrumbs').innerHTML = `<a href="./index.html">Trang chủ</a><span>/</span><a href="./shop.html">Bộ sưu tập</a><span>/</span><a href="./shop.html?category=${product.category}">${product.category}</a><span>/</span><span>${escapeHtml(product.name)}</span>`;
  $('#product-content').innerHTML = `<div class="product-detail"><div class="detail-gallery"><div class="detail-thumbs">${product.images.map((image, index) => `<button data-action="image" data-value="${index}" class="${productImage === index ? 'selected' : ''}" aria-label="Xem ảnh ${index + 1}" aria-pressed="${productImage === index}"><img src="${image}" alt=""></button>`).join('')}</div><img class="detail-main" src="${product.images[productImage]}" alt="${escapeHtml(product.name)} — góc nhìn ${productImage + 1}"></div><div class="detail-info"><p class="eyebrow">NOVA STUDIO / ${product.category}</p><h1>${escapeHtml(product.name)}</h1>${priceMarkup(product)}<p class="detail-lead">Một thiết kế tinh tế cho những ngày bạn muốn mang theo cả phong cách lẫn sự tiện dụng.</p><span class="detail-label">Màu sắc: ${escapeHtml(productColor)}</span><div class="detail-swatches">${product.colors.map(color => `<button data-action="product-color" data-value="${escapeHtml(color.name)}" class="${productColor === color.name ? 'selected' : ''}" title="${escapeHtml(color.name)}" aria-label="Chọn màu ${escapeHtml(color.name)}" aria-pressed="${productColor === color.name}"><span style="--color:${color.hex}"></span></button>`).join('')}</div><span class="detail-label">Số lượng · còn ${Math.max(0, remaining)} chiếc</span><div class="quantity-control"><button data-action="product-decrease" aria-label="Giảm số lượng">−</button><span>${productQuantity}</span><button data-action="product-increase" aria-label="Tăng số lượng">＋</button></div><button class="button button-dark" data-action="product-add" ${remaining < 1 ? 'disabled' : ''}>${remaining < 1 ? 'Hết hàng' : `Thêm vào giỏ · ${formatPrice(product.price * productQuantity)}`} <span aria-hidden="true">↗</span></button><button class="heart-inline" data-action="favorite" data-id="${product.id}">${saved ? '♥ Đã lưu vào yêu thích' : '♡ Lưu vào yêu thích'}</button><div class="detail-specs"><p><span>Chất liệu</span><strong>${escapeHtml(product.material)}</strong></p><p><span>Kích thước</span><strong>${escapeHtml(product.dimensions)}</strong></p><p><span>Đánh giá</span><strong>${product.rating.toFixed(1)} / 5</strong></p><p><span>Mã sản phẩm</span><strong>${product.id}</strong></p></div></div></div>`;
  $('#related-products').innerHTML = PRODUCTS.filter(item => item.category === product.category && item.id !== product.id).slice(0, 4).map(productCard).join('');
}

function renderWishlist() {
  const products = getState().wishlist.map(getProduct).filter(Boolean);
  $('#wishlist-content').innerHTML = products.length ? `<div class="shop-toolbar"><span>${products.length} sản phẩm đã lưu</span></div><div class="product-grid">${products.map(productCard).join('')}</div>` : `<div class="empty-cart"><span aria-hidden="true">♡</span><h2>Chưa có thiết kế yêu thích.</h2><p>Lưu lại những chiếc túi khiến bạn rung động.</p><a class="button button-dark" href="./shop.html">Khám phá bộ sưu tập <span>↗</span></a></div>`;
}

function summaryRows() {
  const totals = getCartTotals();
  return `<div class="summary-row"><span>Tạm tính</span><span>${formatPrice(totals.subtotal)}</span></div>${totals.discount ? `<div class="summary-row muted"><span>Giảm giá 15%</span><span>−${formatPrice(totals.discount)}</span></div>` : ''}<div class="summary-row muted"><span>Vận chuyển</span><span>${totals.shipping ? formatPrice(totals.shipping) : 'Miễn phí'}</span></div><div class="summary-row total"><span>Tổng cộng</span><span>${formatPrice(totals.total)}</span></div>`;
}

function renderCart() {
  const { cart, coupon } = getState();
  if (!cart.length) {
    $('#cart-lines').innerHTML = `<div class="empty-cart"><span aria-hidden="true">▢</span><h2>Giỏ hàng đang trống.</h2><p>Hãy chọn một thiết kế dành cho bạn.</p><a class="button button-dark" href="./shop.html">Khám phá sản phẩm <span>↗</span></a></div>`;
    $('#cart-summary').innerHTML = '';
    return;
  }
  $('#cart-lines').innerHTML = cart.map(item => {
    const product = getProduct(item.id);
    if (!product) return '';
    return `<article class="cart-line"><a href="./product.html?id=${item.id}"><img src="${product.images[0]}" alt="${escapeHtml(product.name)}"></a><div><h2><a href="./product.html?id=${item.id}">${escapeHtml(product.name)}</a></h2><p>Màu: ${escapeHtml(item.color)}</p><p>${product.category}</p><div class="quantity-control"><button data-action="cart-minus" data-id="${item.id}" data-color="${escapeHtml(item.color)}" aria-label="Giảm số lượng">−</button><span>${item.quantity}</span><button data-action="cart-plus" data-id="${item.id}" data-color="${escapeHtml(item.color)}" aria-label="Tăng số lượng">＋</button></div></div><div class="cart-line-price"><strong>${formatPrice(product.price * item.quantity)}</strong><button class="plain-link" data-action="cart-remove" data-id="${item.id}" data-color="${escapeHtml(item.color)}">Xóa</button></div></article>`;
  }).join('') + `<a class="cart-continue" href="./shop.html">← Tiếp tục mua sắm</a>`;
  const totals = getCartTotals();
  $('#cart-summary').innerHTML = `<div class="summary-box"><h2>Tóm tắt đơn hàng</h2><p class="shipping-text">${totals.remaining ? `Mua thêm <strong>${formatPrice(totals.remaining)}</strong> để miễn phí vận chuyển` : 'Đơn hàng đã được miễn phí vận chuyển'}</p><div class="shipping-track" aria-hidden="true"><span style="width:${Math.min(100, totals.subtotal / 5000000 * 100)}%"></span></div><form id="coupon-form" class="coupon-form"><input name="coupon" value="${coupon || ''}" placeholder="Mã giảm giá" aria-label="Mã giảm giá"><button type="submit">Áp dụng</button></form>${coupon ? `<p class="coupon-note">Đã áp dụng ${coupon}</p>` : ''}${summaryRows()}<a class="button button-dark" href="./checkout.html">Tiến hành thanh toán <span>↗</span></a></div>`;
}

function checkoutForm() {
  const user = getState().user;
  const { cart } = getState();
  if (!cart.length) return `<div class="empty-cart"><span aria-hidden="true">▢</span><h2>Chưa có sản phẩm để thanh toán.</h2><p>Khám phá bộ sưu tập và chọn chiếc túi dành cho bạn.</p><a class="button button-dark" href="./shop.html">Xem sản phẩm <span>↗</span></a></div>`;
  return `<div class="checkout-layout"><form id="checkout-form" class="checkout-panel" novalidate><h2>Thông tin giao hàng</h2><div class="field-grid"><div class="field"><label for="ship-name">Họ và tên *</label><input id="ship-name" name="name" value="${escapeHtml(user?.name || '')}" autocomplete="name" required><small></small></div><div class="field"><label for="ship-phone">Số điện thoại *</label><input id="ship-phone" name="phone" autocomplete="tel" inputmode="tel" placeholder="0912345678" required><small></small></div><div class="field wide"><label for="ship-email">Email *</label><input id="ship-email" name="email" type="email" value="${escapeHtml(user?.email || '')}" autocomplete="email" required><small></small></div><div class="field wide"><label for="ship-address">Địa chỉ nhận hàng *</label><input id="ship-address" name="address" autocomplete="street-address" placeholder="Số nhà, tên đường" required><small></small></div><div class="field"><label for="ship-city">Tỉnh / thành phố *</label><input id="ship-city" name="city" autocomplete="address-level1" required><small></small></div><div class="field"><label for="ship-district">Quận / huyện *</label><input id="ship-district" name="district" autocomplete="address-level2" required><small></small></div><div class="field wide"><label for="ship-note">Ghi chú giao hàng</label><textarea id="ship-note" name="note" placeholder="Thông tin thêm (không bắt buộc)"></textarea><small></small></div></div><h3>Phương thức thanh toán</h3><div class="payment-list"><label><input type="radio" name="payment" value="COD" checked> COD</label><label><input type="radio" name="payment" value="QR Banking"> QR Banking</label><label><input type="radio" name="payment" value="Card"> Thẻ ngân hàng</label></div><p class="payment-help" id="payment-help">Thanh toán khi nhận hàng.</p><button class="button button-dark" type="submit">Đặt hàng <span>↗</span></button></form><aside class="summary-box"><h2>Đơn hàng của bạn</h2><div class="checkout-items">${cart.map(item => { const product = getProduct(item.id); return `<p><span>${escapeHtml(product.name)} · ${escapeHtml(item.color)} × ${item.quantity}</span><span>${formatPrice(product.price * item.quantity)}</span></p>`; }).join('')}</div>${summaryRows()}</aside></div>`;
}

function renderCheckout() {
  if (confirmedOrder) {
    $('#checkout-content').innerHTML = `<div class="success-panel"><div class="success-icon" aria-hidden="true">✓</div><p class="eyebrow">ORDER CONFIRMED</p><h2>Cảm ơn bạn!</h2><p>Đơn hàng <strong>#${confirmedOrder.id}</strong> đã được tiếp nhận.</p><p>Chúng tôi sẽ liên hệ qua ${escapeHtml(confirmedOrder.customer.email)} để xác nhận.</p><p>Phương thức thanh toán: ${escapeHtml(confirmedOrder.payment)}.</p><a class="button button-dark" href="./shop.html">Tiếp tục khám phá <span>↗</span></a></div>`;
    return;
  }
  $('#checkout-content').innerHTML = checkoutForm();
}

function validateCheckout(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const errors = {};
  if (values.name.trim().length < 2) errors.name = 'Vui lòng nhập họ tên ít nhất 2 ký tự.';
  if (!/^(0|\+84)[0-9]{9}$/.test(values.phone.replace(/[\s.-]/g, ''))) errors.phone = 'Nhập số điện thoại Việt Nam hợp lệ.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Nhập địa chỉ email hợp lệ.';
  if (values.address.trim().length < 5) errors.address = 'Vui lòng nhập địa chỉ chi tiết.';
  if (values.city.trim().length < 2) errors.city = 'Vui lòng nhập tỉnh / thành phố.';
  if (values.district.trim().length < 2) errors.district = 'Vui lòng nhập quận / huyện.';
  form.querySelectorAll('.field').forEach(field => {
    const input = field.querySelector('input, textarea');
    field.classList.toggle('invalid', Boolean(errors[input.name]));
    field.querySelector('small').textContent = errors[input.name] || '';
  });
  if (Object.keys(errors).length) { form.elements[Object.keys(errors)[0]].focus(); return null; }
  return values;
}

function renderAccount() {
  const user = getState().user;
  if (!user) {
    location.href = './login.html';
    return;
  }
  const orders = getUserOrders();
  $('#account-content').innerHTML = `<div class="account-dashboard"><aside class="profile-box"><p class="eyebrow">TÀI KHOẢN CỦA BẠN</p><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><button class="plain-link" data-action="logout">Đăng xuất</button></aside><section class="order-list"><h2>Lịch sử đơn hàng</h2>${orders.length ? orders.map(order => `<article class="order-entry"><h3><span>#${escapeHtml(order.id)}</span><span>${formatPrice(order.totals.total)}</span></h3><p>${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(order.createdAt))} · ${escapeHtml(order.status)} · ${escapeHtml(order.payment)}</p><p class="order-products">${order.items.map(item => `${escapeHtml(getProduct(item.id)?.name || item.id)} (${escapeHtml(item.color)}) × ${item.quantity}`).join(' · ')}</p></article>`).join('') : `<p class="account-note">Bạn chưa có đơn hàng nào. <a href="./shop.html">Khám phá sản phẩm →</a></p>`}</section></div>`;
}

function renderAuthPage() {
  const container = $('#auth-content');
  if (!container) return;
  if (getState().user) {
    location.href = './account.html';
    return;
  }
  const isLogin = authMode === 'login';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-left">
        <div class="auth-left-top">
          <div class="auth-brand-logo">
            <span class="auth-monogram">NV</span>
            <div class="auth-brand-info">
              <strong>NOVA STUDIO</strong>
              <span>LEATHER ATELIER</span>
            </div>
          </div>
          <div class="auth-headline">
            <h1>Welcome <span class="highlight">NOVA Studio</span></h1>
            <p>${isLogin ? 'Không gian quản lý đơn hàng, danh sách yêu thích và trải nghiệm mua sắm cao cấp.' : 'Khởi tạo tài khoản thành viên để tận hưởng trọn vẹn ưu đãi và theo dõi đơn hàng thời gian thực.'}</p>
          </div>
        </div>
        <div class="auth-left-bottom">
          <div class="auth-divider"></div>
          <div class="auth-meta">
            <span>NOVA Studio Atelier</span>
            <span>v2.0 • 2026</span>
          </div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-header">
          <h2>${isLogin ? 'Đăng nhập hệ thống' : 'Đăng ký tài khoản'}</h2>
          <p>${isLogin ? 'Sử dụng tài khoản của bạn để truy cập không gian mua sắm.' : 'Khởi tạo tài khoản thành viên mới để theo dõi đơn hàng.'}</p>
        </div>
        <div class="auth-tabs-bar">
          <button type="button" data-action="auth-mode" data-value="login" class="${isLogin ? 'active' : ''}">Đăng nhập</button>
          <button type="button" data-action="auth-mode" data-value="register" class="${!isLogin ? 'active' : ''}">Đăng ký</button>
        </div>
        <form id="auth-form" data-mode="${authMode}" class="auth-form" novalidate>
          ${!isLogin ? `
            <div class="auth-field">
              <label for="auth-name">Họ và tên</label>
              <input id="auth-name" name="name" type="text" placeholder="Nguyễn Văn A" autocomplete="name" required>
            </div>
          ` : ''}
          <div class="auth-field">
            <label for="auth-email">${isLogin ? 'Tên đăng nhập hoặc Email' : 'Địa chỉ Email'}</label>
            <input id="auth-email" name="email" type="${isLogin ? 'text' : 'email'}" placeholder="${isLogin ? 'admin hoặc email...' : 'user@example.com'}" autocomplete="username" required>
          </div>
          <div class="auth-field">
            <label for="auth-password">Mật khẩu</label>
            <input id="auth-password" name="password" type="password" placeholder="••••••••••••" minlength="6" autocomplete="${!isLogin ? 'new-password' : 'current-password'}" required>
          </div>
          <button class="auth-submit-btn" type="submit">
            ${isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <div class="auth-switch-note">
          ${isLogin 
            ? 'Chưa có tài khoản? <button type="button" data-action="auth-mode" data-value="register" class="auth-text-link">Đăng ký ngay →</button>' 
            : 'Đã có tài khoản? <button type="button" data-action="auth-mode" data-value="login" class="auth-text-link">Đăng nhập ngay →</button>'}
        </div>
      </div>
    </div>
  `;
}

function renderPage() {
  renderBadges();
  if (PAGE === 'home') renderHome();
  if (PAGE === 'shop') renderShop();
  if (PAGE === 'product') renderProduct();
  if (PAGE === 'wishlist') renderWishlist();
  if (PAGE === 'cart') renderCart();
  if (PAGE === 'checkout' && !document.activeElement?.closest('#checkout-form')) renderCheckout();
  if (PAGE === 'account') renderAccount();
  if (['login', 'register'].includes(PAGE)) renderAuthPage();
}

function resetShop() {
  clearFilters();
  $('#site-search').value = '';
  toast('Đã xóa bộ lọc.');
}

function handleAction(button) {
  const { action, id, color, value } = button.dataset;
  try {
    if (action === 'favorite') toast(toggleWishlist(id) ? 'Đã thêm vào yêu thích.' : 'Đã bỏ khỏi yêu thích.');
    if (action === 'quick-add') { const product = getProduct(id); addToCart(id, product.colors[0].name); toast(`Đã thêm ${product.name} vào giỏ.`); }
    if (action === 'category') setFilters({ category: value });
    if (action === 'color') setFilters({ color: value });
    if (action === 'image') { productImage = Number(value); renderProduct(); }
    if (action === 'product-color') { productColor = value; renderProduct(); }
    if (action === 'product-minus' || action === 'product-decrease') { productQuantity = Math.max(1, productQuantity - 1); renderProduct(); }
    if (action === 'product-increase') { const product = productFromUrl(); if (productQuantity + getQuantityInCart(product.id) >= getAvailableStock(product.id)) throw new Error('Đã đạt số lượng còn trong kho.'); productQuantity++; renderProduct(); }
    if (action === 'product-add') { const product = productFromUrl(); addToCart(product.id, productColor, productQuantity); productQuantity = 1; renderProduct(); toast(`Đã thêm ${product.name} vào giỏ.`); }
    if (action === 'cart-minus') changeCartQuantity(id, color, -1);
    if (action === 'cart-plus') changeCartQuantity(id, color, 1);
    if (action === 'cart-remove') { removeFromCart(id, color); toast('Đã xóa sản phẩm khỏi giỏ.'); }
    if (action === 'auth-mode') {
      authMode = value;
      if (['login', 'register'].includes(PAGE)) {
        try {
          history.replaceState(null, '', `./${value}.html`);
          document.title = (value === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản') + ' | NOVA STUDIO';
        } catch (_) {}
        renderAuthPage();
      } else {
        renderAccount();
      }
    }
    if (action === 'logout') {
      authMode = 'login';
      logout();
      toast('Đã đăng xuất.');
      setTimeout(() => {
        location.href = './login.html';
      }, 350);
    }
  } catch (error) { toast(error.message, true); }
}

function bindEvents() {
  $('#menu-toggle').addEventListener('click', () => {
    const open = $('#mobile-nav').classList.toggle('open');
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
  });
  $('#search-toggle').addEventListener('click', () => {
    const panel = $('#search-panel');
    panel.hidden = !panel.hidden;
    $('#search-toggle').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) $('#site-search').focus();
  });
  $('#site-search').addEventListener('input', event => {
    if (PAGE !== 'shop') return;
    clearTimeout(searchTimer);
    const query = event.target.value;
    searchTimer = setTimeout(() => setFilters({ query }), 250);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      $('#mobile-nav').classList.remove('open');
      $('#menu-toggle').setAttribute('aria-expanded', 'false');
      $('#search-panel').hidden = true;
      $('#search-toggle').setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) handleAction(actionButton);
    if (PAGE === 'shop' && event.target.closest('#filter-toggle')) {
      filtersOpen = !filtersOpen;
      $('#shop-filter').classList.toggle('open', filtersOpen);
      $('#filter-toggle').setAttribute('aria-expanded', String(filtersOpen));
    }
    if (PAGE === 'shop' && event.target.closest('#reset-filters, #empty-reset')) resetShop();
  });
  document.addEventListener('input', event => {
    if (PAGE === 'shop' && event.target.id === 'price-filter') $('#price-output').textContent = formatPrice(Number(event.target.value));
  });
  document.addEventListener('change', event => {
    if (PAGE === 'shop' && event.target.name === 'category') setFilters({ category: event.target.value });
    if (PAGE === 'shop' && event.target.id === 'price-filter') setFilters({ maxPrice: Number(event.target.value) });
    if (PAGE === 'shop' && event.target.id === 'shop-sort') setFilters({ sort: event.target.value });
    if (PAGE === 'checkout' && event.target.name === 'payment') {
      const notes = { COD: 'Thanh toán khi nhận hàng.', 'QR Banking': 'Thông tin chuyển khoản sẽ được xác nhận sau khi đặt hàng.', Card: 'Thanh toán thẻ được mô phỏng; trang này không thu thập thông tin thẻ.' };
      $('#payment-help').textContent = notes[event.target.value];
    }
  });
  document.addEventListener('submit', async event => {
    if (event.target.id === 'search-form') {
      event.preventDefault();
      const query = event.target.elements.q.value.trim();
      location.href = `./shop.html${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    }
    if (event.target.id === 'coupon-form') {
      event.preventDefault();
      try { toast(`Đã áp dụng mã ${applyCoupon(new FormData(event.target).get('coupon'))}.`); }
      catch (error) { toast(error.message, true); }
    }
    if (event.target.id === 'auth-form') {
      event.preventDefault();
      const form = event.target;
      const data = new FormData(form);
      try {
        if (form.dataset.mode === 'register') {
          await register(data.get('name'), data.get('email'), data.get('password'));
          toast('Đăng ký tài khoản thành công!');
        } else {
          await login(data.get('email'), data.get('password'));
          toast('Đăng nhập thành công!');
        }
        setTimeout(() => {
          location.href = './account.html';
        }, 400);
      } catch (error) { toast(error.message, true); }
    }
    if (event.target.id === 'checkout-form') {
      event.preventDefault();
      const values = validateCheckout(event.target);
      if (!values) return;
      try {
        const { payment, ...customer } = values;
        confirmedOrder = placeOrder(customer, payment);
        renderCheckout();
        scrollTo({ top: 0, behavior: 'smooth' });
        toast(`Đặt hàng thành công: #${confirmedOrder.id}`);
      } catch (error) { toast(error.message, true); }
    }
  });
}

export function initUI() {
  $('#site-header').innerHTML = headerMarkup();
  $('#site-footer').innerHTML = footerMarkup();
  if (PAGE === 'shop') readShopUrl();
  bindEvents();
  subscribe(renderPage);
  renderPage();
  if (PAGE === 'shop') $('#site-search').value = getState().filters.query;
}
