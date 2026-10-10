import { storeConfig } from '../config/store.js';

const money = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const cart = [];
let selectedPayment = '';
let lockedScrollY = 0;
let scrollLocks = 0;
let previousFocus = null;

function formatPrice(value) {
  return money.format(Number(value) || 0);
}

function lockBodyScroll() {
  if (scrollLocks === 0) {
    lockedScrollY = window.scrollY;
    Object.assign(document.body.style, {
      position: 'fixed',
      top: `-${lockedScrollY}px`,
      left: '0',
      right: '0',
      overflow: 'hidden',
    });
  }
  scrollLocks += 1;
}

function unlockBodyScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks !== 0) return;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', overflow: '' });
  window.scrollTo(0, lockedScrollY);
}

function icon(className) {
  const element = document.createElement('i');
  element.className = className;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function showToast(id, duration = 1800) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), duration);
}

function setAddButtonState(button, added) {
  button.replaceChildren(
    icon(added ? 'fas fa-check' : 'fas fa-shopping-bag'),
    document.createTextNode(added ? ' ¡Agregado!' : ' Agregar al carrito')
  );
  button.classList.toggle('added', added);
}

function addToCart(button, quantity = 1, sourceCard = null) {
  const card = sourceCard || button.closest('.product-card');
  if (!card) return;
  const id = card.dataset.id || `${card.dataset.brand}::${card.dataset.name}`;
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.qty += quantity;
  } else {
    cart.push({
      id,
      name: card.dataset.name,
      brand: card.dataset.brand,
      price: Number.parseInt(card.dataset.price, 10),
      priceDisplay: card.dataset.priceDisplay,
      img: card.dataset.img,
      qty: quantity,
    });
  }
  setAddButtonState(button, true);
  window.setTimeout(() => setAddButtonState(button, false), 1200);
  updateCartUI();
  showToast('toastAdded');
}

function cartActionButton(label, action, itemId, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.dataset.action = action;
  button.dataset.itemId = itemId;
  button.setAttribute('aria-label', label);
  button.textContent = action === 'decrease' ? '−' : action === 'increase' ? '+' : '';
  if (action === 'remove') button.append(icon('fas fa-times'));
  return button;
}

function renderCartItems() {
  const container = document.getElementById('cartItemsContainer');
  container.replaceChildren();

  if (!cart.length) {
    const empty = document.createElement('div');
    empty.className = 'cart-empty';
    const message = document.createElement('p');
    message.append('Tu carrito está vacío', document.createElement('br'));
    const detail = document.createElement('span');
    detail.className = 'cart-empty-detail';
    detail.textContent = 'Agrega productos para comenzar';
    message.append(detail);
    empty.append(icon('fas fa-shopping-bag'), message);
    container.append(empty);
    return;
  }

  for (const item of cart) {
    const row = document.createElement('div');
    row.className = 'cart-item';
    const imageWrap = document.createElement('div');
    imageWrap.className = 'cart-item-img';
    const image = document.createElement('img');
    image.src = item.img;
    image.alt = item.name;
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.classList.add('image-error'), { once: true });
    imageWrap.append(image);

    const details = document.createElement('div');
    details.className = 'cart-item-details';
    const brand = document.createElement('div');
    brand.className = 'cart-item-brand';
    brand.textContent = item.brand;
    const name = document.createElement('div');
    name.className = 'cart-item-name';
    name.textContent = item.name;
    const controls = document.createElement('div');
    controls.className = 'cart-item-controls';
    const quantity = document.createElement('span');
    quantity.className = 'cart-item-qty';
    quantity.textContent = item.qty;
    const price = document.createElement('span');
    price.className = 'cart-item-price';
    price.textContent = `$${formatPrice(item.price * item.qty)}`;
    controls.append(
      cartActionButton(`Reducir cantidad de ${item.name}`, 'decrease', item.id, 'qty-btn'),
      quantity,
      cartActionButton(`Aumentar cantidad de ${item.name}`, 'increase', item.id, 'qty-btn'),
      price
    );
    details.append(brand, name, controls);
    row.append(
      imageWrap,
      details,
      cartActionButton(`Eliminar ${item.name}`, 'remove', item.id, 'cart-item-remove')
    );
    container.append(row);
  }
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = totalItems;
  badge.hidden = totalItems === 0;
  document.getElementById('cartButton').setAttribute(
    'aria-label',
    totalItems ? `Abrir carrito (${totalItems} producto${totalItems === 1 ? '' : 's'})` : 'Abrir carrito'
  );
  badge.classList.remove('bump');
  void badge.offsetWidth;
  badge.classList.add('bump');
  document.getElementById('cartTotal').textContent = formatPrice(totalPrice);
  document.getElementById('sendWhatsappBtn').disabled = totalItems === 0;
  document.getElementById('vaciarCarritoBtn').disabled = totalItems === 0;
  renderCartItems();
}

function changeQuantity(itemId, delta) {
  const item = cart.find((candidate) => candidate.id === itemId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart.splice(cart.indexOf(item), 1);
  updateCartUI();
}

function openCart() {
  previousFocus = document.activeElement;
  document.getElementById('cartOverlay').classList.add('open');
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  document.getElementById('cartDrawerClose').focus();
}

function closeCart({ restoreFocus = true } = {}) {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer.classList.contains('open')) return;
  document.getElementById('cartOverlay').classList.remove('open');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
  if (restoreFocus) previousFocus?.focus?.();
}

function renderCheckoutSummary() {
  const summary = document.getElementById('checkoutSummary');
  summary.replaceChildren();
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const title = document.createElement('h4');
  title.append(icon('fas fa-shopping-bag'), ` Tu pedido (${totalItems} producto${totalItems === 1 ? '' : 's'})`);
  const items = document.createElement('div');
  items.className = 'checkout-summary-items';
  for (const item of cart) {
    const line = document.createElement('div');
    line.textContent = `♡ ${item.brand} — ${item.name}${item.qty > 1 ? ` ×${item.qty} ($${item.priceDisplay} c/u)` : ` $${item.priceDisplay}`}`;
    items.append(line);
  }
  const total = document.createElement('div');
  total.className = 'checkout-summary-total';
  const totalLabel = document.createElement('span');
  totalLabel.textContent = 'Total';
  const totalValue = document.createElement('span');
  totalValue.textContent = `$${formatPrice(totalPrice)}`;
  total.append(totalLabel, totalValue);
  summary.append(title, items, total);
}

function openCheckoutForm() {
  if (!cart.length) return;
  closeCart({ restoreFocus: false });
  renderCheckoutSummary();
  for (const id of ['checkoutNombre', 'checkoutDireccion', 'checkoutTelefono']) {
    document.getElementById(id).value = '';
  }
  selectedPayment = '';
  document.querySelectorAll('.checkout-payment-option').forEach((element) => element.classList.remove('selected'));
  document.querySelectorAll('.field-error').forEach((element) => element.classList.remove('show'));
  const overlay = document.getElementById('checkoutOverlay');
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  document.getElementById('checkoutNombre').focus();
}

function closeCheckoutForm() {
  const overlay = document.getElementById('checkoutOverlay');
  if (!overlay.classList.contains('active')) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
  previousFocus?.focus?.();
}

function selectPayment(button) {
  document.querySelectorAll('.checkout-payment-option').forEach((option) => option.classList.remove('selected'));
  button.classList.add('selected');
  selectedPayment = button.dataset.method;
  document.getElementById('errorPago').classList.remove('show');
}

function setFieldValidity(inputId, errorId, valid) {
  document.getElementById(errorId).classList.toggle('show', !valid);
  document.getElementById(inputId).setAttribute('aria-invalid', String(!valid));
  return valid;
}

function sendWhatsApp() {
  if (!cart.length) return;
  const nombre = document.getElementById('checkoutNombre').value.trim();
  const direccion = document.getElementById('checkoutDireccion').value.trim();
  const telefono = document.getElementById('checkoutTelefono').value.trim();
  const valid = [
    setFieldValidity('checkoutNombre', 'errorNombre', Boolean(nombre)),
    setFieldValidity('checkoutDireccion', 'errorDireccion', Boolean(direccion)),
    setFieldValidity('checkoutTelefono', 'errorTelefono', Boolean(telefono)),
    selectedPayment ? true : (document.getElementById('errorPago').classList.add('show'), false),
  ].every(Boolean);
  if (!valid) return;

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const lines = [
    '🛍️ *PEDIDO GLAM STUDIO* ✨',
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '📦 *Productos:*',
    ...cart.map((item) => {
      const quantity = item.qty > 1 ? ` ×${item.qty}  ($${item.priceDisplay} c/u)  = $${formatPrice(item.price * item.qty)}` : `  $${item.priceDisplay}`;
      return `♡ ${item.brand} — ${item.name}${quantity}`;
    }),
    '',
    `💰 *Total: $${formatPrice(totalPrice)}*`,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '👤 *Datos del cliente:*',
    `• Nombre: ${nombre}`,
    `• Dirección: ${direccion}`,
    `• Teléfono: ${telefono}`,
    `• Pago: ${selectedPayment === 'transferencia' ? '💳 Transferencia' : '💵 Efectivo'}`,
    '',
    '¡Gracias por confiar en nosotras! 💕✨',
  ];
  const link = document.createElement('a');
  link.href = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
  showToast('toastWhatsapp', 3000);
  closeCheckoutForm();
}

function vaciarCarrito() {
  if (!cart.length || !window.confirm('¿Segura que quieres vaciar el carrito?')) return;
  cart.splice(0, cart.length);
  updateCartUI();
}

const zoomOverlay = document.getElementById('zoomOverlay');
const zoomImage = document.getElementById('zoomImage');

const zoomThumbs = document.getElementById('zoomThumbs');
let zoomSources = [];
let zoomIndex = 0;

function showZoomImage(index, animate = true) {
  if (!zoomSources[index]) return;
  const direction = index > zoomIndex ? 1 : -1;
  zoomIndex = index;
  zoomImage.src = zoomSources[index];
  zoomThumbs.querySelectorAll('.zoom-thumb').forEach((thumb) => {
    thumb.classList.toggle('is-active', Number(thumb.dataset.zoomIndex) === index);
  });
  if (!animate) return;
  zoomImage.style.setProperty('--swap-from', `${direction * 28}px`);
  zoomImage.classList.remove('is-swapping');
  void zoomImage.offsetWidth;
  zoomImage.classList.add('is-swapping');
}

function openZoom(image, { sources = null, start = null, alt = '' } = {}) {
  const card = image.closest('.product-card');
  zoomSources = sources || [card?.dataset.img || image.currentSrc || image.src];
  if (!sources && card?.dataset.img2) zoomSources.push(card.dataset.img2);
  zoomIndex = 0;
  zoomThumbs.hidden = zoomSources.length < 2;
  zoomThumbs.querySelectorAll('.zoom-thumb').forEach((thumb, index) => {
    thumb.style.backgroundImage = zoomSources[index] ? `url("${zoomSources[index].replace(/"/g, '%22')}")` : '';
  });
  zoomImage.classList.remove('is-swapping');
  const hovering = Boolean(card?.classList.contains('show-second'))
    || (window.matchMedia('(hover: hover)').matches && Boolean(card?.matches(':hover')));
  showZoomImage(start ?? (zoomSources.length > 1 && hovering ? 1 : 0), false);
  zoomImage.alt = alt || card?.querySelector('.product-lazy-img')?.alt || image.alt;
  previousFocus = image;
  zoomOverlay.classList.add('active');
  zoomOverlay.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  document.getElementById('zoomClose').focus();
}

function closeZoom() {
  if (!zoomOverlay.classList.contains('active')) return;
  zoomOverlay.classList.remove('active');
  zoomOverlay.setAttribute('aria-hidden', 'true');
  zoomImage.removeAttribute('src');
  zoomSources = [];
  unlockBodyScroll();
  previousFocus?.focus?.();
}

const FAVORITES_KEY = 'glam:favorites';

function readFavorites() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function writeFavorites(favorites) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    /* Sin almacenamiento disponible: el corazón funciona solo en esta visita. */
  }
}

function productKey(card) {
  return card.dataset.id || `${card.dataset.brand}::${card.dataset.name}`;
}

function paintFavorite(button, active) {
  button.classList.toggle('is-fav', active);
  button.setAttribute('aria-pressed', String(active));
  const heart = button.querySelector('i');
  if (heart) heart.className = `${active ? 'fas' : 'far'} fa-heart`;
}

function initFavorites() {
  const favorites = readFavorites();
  document.querySelectorAll('.product-card').forEach((card) => {
    const button = card.querySelector('.fav-btn');
    if (button) paintFavorite(button, favorites.has(productKey(card)));
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="toggle-favorite"]');
    if (!button) return;
    const card = button.closest('.product-card');
    if (!card) return;
    const key = productKey(card);
    const active = !favorites.has(key);
    if (active) favorites.add(key);
    else favorites.delete(key);
    paintFavorite(button, active);
    writeFavorites(favorites);
  });
}

function setCategoryFilter(slug) {
  const filter = slug || 'todo';
  document.querySelectorAll('.pill').forEach((pill) => {
    const active = pill.dataset.filter === filter;
    pill.classList.toggle('is-active', active);
    pill.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.catalog-category').forEach((section) => {
    section.classList.toggle('filter-hidden', filter !== 'todo' && section.dataset.category !== filter);
  });
}

function initNavigation() {
  const header = document.getElementById('top');
  const menuToggle = document.getElementById('menuToggle');
  const searchToggle = document.getElementById('searchToggle');
  const searchInput = document.getElementById('searchInput');

  const setMenu = (open) => {
    header.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    const menuIcon = menuToggle.querySelector('i');
    menuIcon.classList.toggle('fa-bars', !open);
    menuIcon.classList.toggle('fa-xmark', open);
  };
  const setSearch = (open) => {
    header.classList.toggle('search-open', open);
    searchToggle.setAttribute('aria-expanded', String(open));
    if (open) searchInput.focus();
  };

  menuToggle.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
  searchToggle.addEventListener('click', () => setSearch(!header.classList.contains('search-open')));
  document.getElementById('siteNav').addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', (event) => {
    if (header.classList.contains('menu-open') && !header.contains(event.target)) setMenu(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) setMenu(false);
  });

  document.getElementById('categoryNav').addEventListener('click', (event) => {
    const pill = event.target.closest('.pill');
    if (!pill) return;
    setCategoryFilter(pill.dataset.filter);
    if (pill.dataset.filter !== 'todo') {
      document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  const toTop = document.getElementById('inicioFloatBtn');
  const syncToTop = () => toTop.classList.toggle('visible', window.scrollY > 700);
  window.addEventListener('scroll', syncToTop, { passive: true });
  syncToTop();

  // La imagen de portada se oculta si alguna foto no carga.
  document.querySelectorAll('.hero-shot img').forEach((image) => {
    const hide = () => image.closest('.hero-shot')?.remove();
    if (image.complete && image.naturalWidth === 0) hide();
    else image.addEventListener('error', hide, { once: true });
  });

  setMenu(false);
  setSearch(false);
  return { setMenu, setSearch };
}

function setSearchResultMessage(element, count, query) {
  element.replaceChildren();
  if (count === 0) element.append('No se encontraron productos para ');
  else element.append(`Se encontraron ${count} producto${count === 1 ? '' : 's'} para `);
  const term = document.createElement('span');
  term.textContent = `“${query}”`;
  element.append(term);
}

function initSearch() {
  const input = document.getElementById('searchInput');
  const clearButton = document.getElementById('searchClearBtn');
  const searchIcon = document.getElementById('searchIcon');
  const info = document.getElementById('searchResultsInfo');
  let timeout;
  const perform = () => {
    const query = input.value.trim().toLocaleLowerCase('es');
    if (query) setCategoryFilter('todo');
    clearButton.classList.toggle('visible', Boolean(query));
    const counts = new Map();
    let matches = 0;
    document.querySelectorAll('.product-card').forEach((card) => {
      const match = !query || `${card.dataset.name} ${card.dataset.brand}`.toLocaleLowerCase('es').includes(query);
      card.classList.toggle('search-hidden', !match);
      if (match && query) {
        matches += 1;
        const category = card.closest('.catalog-category');
        if (category) counts.set(category, (counts.get(category) || 0) + 1);
      }
    });
    document.querySelectorAll('.catalog-category').forEach((category) => {
      category.classList.toggle('search-hidden', Boolean(query) && !counts.has(category));
      const visible = category.querySelectorAll('.product-card:not(.search-hidden)').length;
      const label = category.querySelector('.category-count');
      if (label) label.textContent = `${visible} producto${visible === 1 ? '' : 's'}`;
    });
    info.classList.toggle('visible', Boolean(query));
    if (query) setSearchResultMessage(info, matches, input.value.trim());
    else info.replaceChildren();
  };
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = window.setTimeout(perform, 180);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.value = '';
      perform();
    }
  });
  clearButton.addEventListener('click', () => {
    input.value = '';
    perform();
    input.focus();
  });
  searchIcon.addEventListener('click', () => input.focus());
}

// ─── DETALLE DEL PRODUCTO ───
const pdOverlay = document.getElementById('pdOverlay');
const pdImage = document.getElementById('pdImage');
const pdThumbs = document.getElementById('pdThumbs');
let pdCard = null;
let pdSources = [];
let pdIndex = 0;
let pdQty = 1;
let pdFocus = null;

function showPdImage(index) {
  if (!pdSources[index]) return;
  pdIndex = index;
  pdImage.src = pdSources[index];
  pdThumbs.querySelectorAll('.pd-thumb').forEach((thumb) => {
    thumb.classList.toggle('is-active', Number(thumb.dataset.pdIndex) === index);
  });
}

function setPdQty(value) {
  pdQty = Math.min(99, Math.max(1, value));
  document.getElementById('pdQty').textContent = String(pdQty);
}

function openProductDetail(card, trigger) {
  pdCard = card;
  const img = card.querySelector('.product-lazy-img');
  pdSources = [card.dataset.img];
  if (card.dataset.img2) pdSources.push(card.dataset.img2);
  pdThumbs.hidden = pdSources.length < 2;
  pdThumbs.querySelectorAll('.pd-thumb').forEach((thumb, index) => {
    thumb.style.backgroundImage = pdSources[index] ? `url("${pdSources[index].replace(/"/g, '%22')}")` : '';
  });
  pdImage.alt = img?.alt || card.dataset.name;
  document.getElementById('pdBrand').textContent = card.dataset.brand;
  document.getElementById('pdName').textContent = card.querySelector('.product-name')?.textContent || card.dataset.name;
  document.getElementById('pdCategory').textContent = card.closest('.catalog-category')?.querySelector('h2')?.textContent || '';
  document.getElementById('pdPrice').textContent = card.dataset.priceDisplay;
  setPdQty(1);
  showPdImage(card.classList.contains('show-second') && pdSources.length > 1 ? 1 : 0);
  pdFocus = trigger;
  pdOverlay.classList.add('active');
  pdOverlay.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  document.getElementById('pdClose').focus();
}

function closeProductDetail({ restoreFocus = true } = {}) {
  if (!pdOverlay.classList.contains('active')) return;
  pdOverlay.classList.remove('active');
  pdOverlay.setAttribute('aria-hidden', 'true');
  pdImage.removeAttribute('src');
  pdCard = null;
  unlockBodyScroll();
  if (restoreFocus) pdFocus?.focus?.();
}

pdOverlay.addEventListener('click', (event) => {
  if (event.target === pdOverlay) return closeProductDetail();
  const thumb = event.target.closest('.pd-thumb');
  if (thumb) showPdImage(Number(thumb.dataset.pdIndex));
});
document.getElementById('pdClose').addEventListener('click', () => closeProductDetail());
document.getElementById('pdMinus').addEventListener('click', () => setPdQty(pdQty - 1));
document.getElementById('pdPlus').addEventListener('click', () => setPdQty(pdQty + 1));
document.getElementById('pdMain').addEventListener('click', () => {
  if (pdCard) openZoom(pdImage, { sources: pdSources, start: pdIndex, alt: pdImage.alt });
});
document.getElementById('pdAdd').addEventListener('click', (event) => {
  if (pdCard) addToCart(event.currentTarget, pdQty, pdCard);
});
document.getElementById('pdBuy').addEventListener('click', () => {
  if (!pdCard) return;
  addToCart(document.getElementById('pdAdd'), pdQty, pdCard);
  closeProductDetail({ restoreFocus: false });
  openCart();
});

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-action="add-to-cart"]');
  if (addButton) addToCart(addButton);
  const productImage = event.target.closest('.product-image-wrap img');
  if (suppressImageClick) return;
  const opener = productImage || event.target.closest('.product-name');
  const card = opener?.closest('.product-card');
  if (card) openProductDetail(card, opener);
});
document.getElementById('cartItemsContainer').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'remove') {
    const item = cart.find((candidate) => candidate.id === button.dataset.itemId);
    if (item) cart.splice(cart.indexOf(item), 1);
    updateCartUI();
  } else {
    changeQuantity(button.dataset.itemId, button.dataset.action === 'increase' ? 1 : -1);
  }
});
document.getElementById('inicioFloatBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.getElementById('cartButton').addEventListener('click', openCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('cartDrawerClose').addEventListener('click', closeCart);
document.getElementById('sendWhatsappBtn').addEventListener('click', openCheckoutForm);
document.getElementById('vaciarCarritoBtn').addEventListener('click', vaciarCarrito);
document.getElementById('checkoutClose').addEventListener('click', closeCheckoutForm);
document.getElementById('checkoutOverlay').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closeCheckoutForm();
});
document.querySelectorAll('.checkout-payment-option').forEach((button) => {
  button.addEventListener('click', () => selectPayment(button));
});
document.getElementById('checkoutWhatsappBtn').addEventListener('click', sendWhatsApp);
document.getElementById('zoomClose').addEventListener('click', closeZoom);
zoomOverlay.addEventListener('click', (event) => {
  const thumb = event.target.closest('.zoom-thumb');
  if (thumb) {
    showZoomImage(Number(thumb.dataset.zoomIndex));
    return;
  }
  if (event.target === zoomOverlay) closeZoom();
});
// Deslizar en el visor ampliado cambia entre las dos fotos del producto.
let swipeStartX = null;
zoomOverlay.addEventListener('touchstart', (event) => { swipeStartX = event.touches[0].clientX; }, { passive: true });
zoomOverlay.addEventListener('touchend', (event) => {
  if (swipeStartX === null || zoomSources.length < 2) return;
  const delta = event.changedTouches[0].clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(delta) > 40) showZoomImage(delta < 0 ? 1 : 0);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    const activeDialog = document.getElementById('checkoutOverlay').classList.contains('active')
      ? document.getElementById('checkoutOverlay')
      : zoomOverlay.classList.contains('active') ? zoomOverlay
      : pdOverlay.classList.contains('active') ? pdOverlay : null;
    if (activeDialog) {
      const controls = [...activeDialog.querySelectorAll('button:not([disabled]), input:not([disabled])')]
        .filter((element) => element.offsetParent !== null);
      if (controls.length) {
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    return;
  }
  if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && zoomOverlay.classList.contains('active') && zoomSources.length > 1) {
    showZoomImage(event.key === 'ArrowRight' ? 1 : 0);
    return;
  }
  if (event.key !== 'Escape') return;
  if (zoomOverlay.classList.contains('active')) { closeZoom(); return; }
  closeProductDetail();
  closeCheckoutForm();
  closeCart();
  navigation.setMenu(false);
});

// Segunda foto que no carga: se oculta y la tarjeta queda con una sola imagen.
function initSecondImages() {
  document.querySelectorAll('.product-img-second').forEach((image) => {
    const fail = () => {
      image.classList.add('is-broken');
      const card = image.closest('.product-card');
      card?.classList.remove('has-second-image');
      card?.removeAttribute('data-img2');
      card?.querySelector('.product-img-dots')?.remove();
    };
    // Algunos CDN exigen el tipo de contenido en la URL (Safari/iOS): se reintenta una vez.
    const retryOrFail = () => {
      const src = image.getAttribute('src') || '';
      if (!src.includes('response-content-type') && !image.dataset.retried) {
        image.dataset.retried = '1';
        image.src = `${src}${src.includes('?') ? '&' : '?'}response-content-type=image%2Fpng`;
        return;
      }
      fail();
    };
    if (image.complete && image.naturalWidth === 0 && image.currentSrc) retryOrFail();
    else image.addEventListener('error', retryOrFail);
  });
}

// En celulares no hay "pasar el cursor": se desliza la foto o se tocan los puntos.
function toggleSecondImage(card) {
  if (card?.classList.contains('has-second-image')) card.classList.toggle('show-second');
}

let cardSwipe = null;
let suppressImageClick = false;
document.addEventListener('touchstart', (event) => {
  const wrap = event.target.closest('.has-second-image .product-image-wrap');
  cardSwipe = wrap ? { x: event.touches[0].clientX, y: event.touches[0].clientY, card: wrap.closest('.product-card') } : null;
}, { passive: true });
document.addEventListener('touchend', (event) => {
  if (!cardSwipe) return;
  const dx = event.changedTouches[0].clientX - cardSwipe.x;
  const dy = event.changedTouches[0].clientY - cardSwipe.y;
  const { card } = cardSwipe;
  cardSwipe = null;
  if (Math.abs(dx) < 35 || Math.abs(dy) > Math.abs(dx)) return;
  const showing = card.classList.contains('show-second');
  if ((dx < 0 && !showing) || (dx > 0 && showing)) toggleSecondImage(card);
  suppressImageClick = true;
  window.setTimeout(() => { suppressImageClick = false; }, 400);
});
document.addEventListener('click', (event) => {
  const dots = event.target.closest('.product-img-dots');
  if (dots) toggleSecondImage(dots.closest('.product-card'));
});

// Las tarjetas aparecen suavemente al desplazarse por el catálogo.
function initCardReveal() {
  const cards = [...document.querySelectorAll('.product-card')];
  if (!cards.length || !('IntersectionObserver' in window)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting);
    visible.forEach((entry, index) => {
      const card = entry.target;
      observer.unobserve(card);
      const delay = Math.min(index, 5) * 70;
      card.style.setProperty('--reveal-delay', `${delay}ms`);
      card.classList.add('reveal-in');
      window.setTimeout(() => {
        card.classList.remove('reveal-pending', 'reveal-in');
        card.style.removeProperty('--reveal-delay');
      }, 900 + delay);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  cards.forEach((card) => {
    card.classList.add('reveal-pending');
    observer.observe(card);
  });
  // Red de seguridad: si algo falla, ninguna tarjeta queda oculta.
  window.setTimeout(() => cards.forEach((card) => card.classList.remove('reveal-pending')), 8000);
}

const navigation = initNavigation();
initSecondImages();
initCardReveal();
initFavorites();
initSearch();
updateCartUI();
