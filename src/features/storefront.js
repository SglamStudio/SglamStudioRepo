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

function addToCart(button) {
  const card = button.closest('.product-card');
  if (!card) return;
  const id = card.dataset.id || `${card.dataset.brand}::${card.dataset.name}`;
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id,
      name: card.dataset.name,
      brand: card.dataset.brand,
      price: Number.parseInt(card.dataset.price, 10),
      priceDisplay: card.dataset.priceDisplay,
      img: card.dataset.img,
      qty: 1,
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
  badge.classList.remove('bump');
  void badge.offsetWidth;
  badge.classList.add('bump');
  document.getElementById('cartFloat').classList.toggle('hidden', totalItems === 0);
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

function openZoom(image) {
  const card = image.closest('.product-card');
  zoomImage.src = card?.dataset.img || image.currentSrc || image.src;
  zoomImage.alt = image.alt;
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
  unlockBodyScroll();
  previousFocus?.focus?.();
}

function initNavigation() {
  const categoryNav = document.getElementById('categoryNav');
  const toggle = document.getElementById('categoryMenuToggle');
  const links = document.getElementById('categoryNavLinks');
  const searchBar = document.getElementById('searchBarContainer');
  const setMenu = (open) => {
    categoryNav?.classList.toggle('menu-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    const menuIcon = toggle?.querySelector('.category-menu-icon');
    menuIcon?.classList.toggle('fa-bars', !open);
    menuIcon?.classList.toggle('fa-xmark', open);
    requestAnimationFrame(() => {
      if (categoryNav && searchBar) searchBar.style.top = `${categoryNav.offsetHeight}px`;
    });
  };
  toggle?.addEventListener('click', () => setMenu(!categoryNav.classList.contains('menu-open')));
  links?.addEventListener('click', (event) => {
    const button = event.target.closest('.nav-btn');
    if (!button) return;
    event.preventDefault();
    setMenu(false);
    const target = document.getElementById(button.dataset.target);
    if (!target) return;
    const offset = (categoryNav?.offsetHeight || 0) + (searchBar?.offsetHeight || 0);
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  });
  document.addEventListener('click', (event) => {
    if (categoryNav?.classList.contains('menu-open') && !categoryNav.contains(event.target)) setMenu(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 600) setMenu(false);
    else if (categoryNav && searchBar) searchBar.style.top = `${categoryNav.offsetHeight}px`;
  });

  const navButtons = document.querySelectorAll('.nav-btn');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navButtons.forEach((button) => button.classList.toggle('active', button.dataset.target === entry.target.id));
      }
    }, { rootMargin: '-160px 0px -50% 0px' });
    document.querySelectorAll('.category-banner[id]').forEach((section) => observer.observe(section));
  }
  setMenu(false);
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

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-action="add-to-cart"]');
  if (addButton) addToCart(addButton);
  const productImage = event.target.closest('.product-image-wrap img');
  if (productImage) openZoom(productImage);
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
document.getElementById('cartFloat').addEventListener('click', openCart);
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
  if (event.target === zoomOverlay) closeZoom();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    const activeDialog = document.getElementById('checkoutOverlay').classList.contains('active')
      ? document.getElementById('checkoutOverlay')
      : zoomOverlay.classList.contains('active') ? zoomOverlay : null;
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
  if (event.key !== 'Escape') return;
  closeZoom();
  closeCheckoutForm();
  closeCart();
  document.getElementById('categoryNav')?.classList.remove('menu-open');
});

initNavigation();
initSearch();
updateCartUI();
