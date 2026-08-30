import { adminApi } from './adminAccess.js';
import { downloadLegacyBackup, hasLegacyCatalogData } from './legacyBackup.js';

const money = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const state = {
  products: [],
  categories: [],
  activeCategoryId: 'all',
  query: '',
  dirtyPrices: new Map(),
  loaded: false,
  catalogChanged: false,
};
let initialized = false;
let previousFocus = null;
let toastTimer = 0;

function byId(id) {
  return document.getElementById(id);
}

function adminIcon(className) {
  const element = document.createElement('i');
  element.className = className;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function setStatus(message, type = '') {
  const element = byId('adminApiStatus');
  element.textContent = message;
  element.className = `admin-api-status${type ? ` admin-api-status--${type}` : ''}`;
}

function showToast(message, action = null) {
  window.clearTimeout(toastTimer);
  byId('adminToastMessage').textContent = message;
  const actionButton = byId('adminToastAction');
  actionButton.hidden = !action;
  actionButton.replaceWith(actionButton.cloneNode(true));
  const currentActionButton = byId('adminToastAction');
  if (action) {
    currentActionButton.hidden = false;
    currentActionButton.textContent = action.label;
    currentActionButton.addEventListener('click', async () => {
      currentActionButton.disabled = true;
      try {
        hideToast();
        await action.run();
      } catch (error) {
        setStatus(error.message, 'error');
      }
    }, { once: true });
  }
  byId('adminToast').classList.toggle('has-action', Boolean(action));
  byId('adminToast').classList.add('show');
  toastTimer = window.setTimeout(hideToast, action ? 7000 : 2600);
}

function hideToast() {
  byId('adminToast')?.classList.remove('show', 'has-action');
}

async function loadAdminCatalog() {
  setStatus('Sincronizando con PostgreSQL…');
  const [productPayload, categoryPayload] = await Promise.all([
    adminApi('/admin/catalog/products'),
    adminApi('/admin/catalog/categories'),
  ]);
  state.products = productPayload.products;
  state.categories = categoryPayload.categories;
  state.loaded = true;
  renderAll();
  setStatus(`Sincronizado: ${state.products.length} productos y ${state.categories.length} categorías.`, 'success');
}

function activeCategories() {
  return state.categories.filter((category) => category.active);
}

function renderCategoryTabs() {
  const container = byId('adminCatTabs');
  container.replaceChildren();
  const all = document.createElement('button');
  all.type = 'button';
  all.className = `admin-cat-tab${state.activeCategoryId === 'all' ? ' active' : ''}`;
  all.dataset.categoryId = 'all';
  all.textContent = 'Todos';
  container.append(all);
  for (const category of state.categories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `admin-cat-tab${state.activeCategoryId === category.id ? ' active' : ''}`;
    button.dataset.categoryId = category.id;
    button.textContent = `${category.adminLabel}${category.active ? '' : ' (inactiva)'}`;
    container.append(button);
  }
}

function fillCategorySelect() {
  const select = byId('adminProductCategory');
  const selected = select.value;
  select.replaceChildren();
  for (const category of activeCategories()) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.adminLabel;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === selected)) select.value = selected;
}

function visibleProducts() {
  const query = state.query.toLocaleLowerCase('es');
  return state.products.filter((product) => {
    const categoryMatches = state.activeCategoryId === 'all' || product.categoryId === state.activeCategoryId;
    const textMatches = !query || `${product.name} ${product.displayName} ${product.brand}`.toLocaleLowerCase('es').includes(query);
    return categoryMatches && textMatches;
  });
}

function actionButton(label, iconClass, className, action, productId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.dataset.action = action;
  button.dataset.productId = productId;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(adminIcon(iconClass));
  return button;
}

function renderProducts() {
  const list = byId('adminProductList');
  list.replaceChildren();
  const products = visibleProducts();
  byId('adminCounter').textContent = `${products.length} producto${products.length === 1 ? '' : 's'} visible${products.length === 1 ? '' : 's'}`;
  byId('adminScopeNote').textContent = `Las acciones masivas afectan ${products.filter((product) => product.active).length} productos activos visibles. Guardar precios incluye todos los cambios pendientes, aunque cambies de filtro.`;

  for (const product of products) {
    const row = document.createElement('div');
    row.className = `admin-product-row${state.dirtyPrices.has(product.id) ? ' modified' : ''}${product.active ? '' : ' inactive'}`;
    row.dataset.productId = product.id;
    const image = document.createElement('img');
    image.className = 'admin-product-img';
    image.src = product.image;
    image.alt = '';
    image.referrerPolicy = 'no-referrer';

    const info = document.createElement('div');
    info.className = 'admin-product-info';
    const name = document.createElement('div');
    name.className = 'admin-product-name';
    name.textContent = product.displayName;
    const brand = document.createElement('div');
    brand.className = 'admin-product-brand';
    brand.textContent = `${product.brand} · ${product.categoryLabel}${product.active ? '' : ' · INACTIVO'}`;
    info.append(name, brand);

    const original = document.createElement('span');
    original.className = 'admin-original-price';
    original.textContent = `$${money.format(product.initialPrice ?? product.price)}`;
    original.title = 'Precio inicial';
    const priceWrap = document.createElement('label');
    priceWrap.className = 'admin-product-price-wrap';
    priceWrap.setAttribute('aria-label', `Precio de ${product.displayName}`);
    const sign = document.createElement('span');
    sign.className = 'dollar-sign';
    sign.textContent = '$';
    const input = document.createElement('input');
    input.className = 'admin-price-input';
    input.type = 'number';
    input.min = '0';
    input.max = '100000000';
    input.step = '100';
    input.dataset.productId = product.id;
    input.value = state.dirtyPrices.get(product.id) ?? product.price;
    priceWrap.append(sign, input);

    const actions = document.createElement('div');
    actions.className = 'admin-row-actions';
    actions.append(
      actionButton(`Editar ${product.displayName}`, 'fas fa-pen', 'admin-row-action admin-edit-product-btn', 'edit', product.id),
      actionButton(
        product.active ? `Desactivar ${product.displayName}` : `Restaurar ${product.displayName}`,
        product.active ? 'fas fa-trash-alt' : 'fas fa-undo',
        product.active ? 'admin-row-action admin-delete-product-btn' : 'admin-row-action admin-restore-product-btn',
        product.active ? 'deactivate' : 'restore',
        product.id
      )
    );
    row.append(image, info, original, priceWrap, actions);
    list.append(row);
  }
  if (!products.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty-state';
    empty.textContent = 'No hay productos para este filtro.';
    list.append(empty);
  }
  updateSaveButton();
}

function categoryActionButton(label, action, categoryId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'admin-device-btn';
  button.dataset.categoryAction = action;
  button.dataset.categoryId = categoryId;
  button.textContent = label;
  return button;
}

function renderCategoryManager() {
  const list = byId('adminCategoryList');
  list.replaceChildren();
  for (const category of state.categories) {
    const row = document.createElement('div');
    row.className = `admin-category-row${category.active ? '' : ' inactive'}`;
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = `${category.adminLabel} (${category.slug})`;
    const detail = document.createElement('span');
    detail.textContent = `${category.activeProductCount} activos · ${category.productCount} totales${category.active ? '' : ' · inactiva'}`;
    info.append(name, detail);
    const actions = document.createElement('div');
    actions.className = 'admin-category-actions';
    actions.append(categoryActionButton('Editar', 'edit', category.id));
    actions.append(categoryActionButton(category.active ? 'Desactivar' : 'Restaurar', category.active ? 'deactivate' : 'restore', category.id));
    row.append(info, actions);
    list.append(row);
  }
}

function renderAll() {
  renderCategoryTabs();
  fillCategorySelect();
  renderCategoryManager();
  renderProducts();
}

function updateSaveButton() {
  const button = byId('adminSavePricesBtn');
  const count = state.dirtyPrices.size;
  button.disabled = count === 0;
  button.querySelector('span').textContent = count
    ? `Guardar ${count} cambio${count === 1 ? '' : 's'} de precio`
    : 'Sin cambios de precio pendientes';
}

function setFormOpen(formId, toggleId, open) {
  byId(formId).classList.toggle('open', open);
  byId(toggleId).classList.toggle('open', open);
  byId(toggleId).setAttribute('aria-expanded', String(open));
}

function resetProductForm() {
  byId('adminProductForm').reset();
  byId('adminProductId').value = '';
  byId('adminProductFormHeading').textContent = 'Agregar producto';
  byId('adminProductCancel').hidden = true;
  byId('adminProductImgPreview').classList.remove('visible');
  fillCategorySelect();
}

function editProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  byId('adminProductId').value = product.id;
  byId('adminProductName').value = product.name;
  byId('adminProductDisplayName').value = product.displayName;
  byId('adminProductBrand').value = product.brand;
  byId('adminProductCategory').value = product.categoryId;
  byId('adminProductPrice').value = state.dirtyPrices.get(product.id) ?? product.price;
  byId('adminProductImage').value = product.image;
  byId('adminProductImgPreview').src = product.image;
  byId('adminProductImgPreview').classList.add('visible');
  byId('adminProductFormHeading').textContent = 'Editar producto';
  byId('adminProductCancel').hidden = false;
  setFormOpen('adminProductForm', 'adminAddProductToggle', true);
  byId('adminProductName').focus();
}

async function submitProduct(event) {
  event.preventDefault();
  const form = byId('adminProductForm');
  if (!form.reportValidity()) return;
  const imageUrl = byId('adminProductImage').value.trim();
  if (!imageUrl.startsWith('https://')) {
    byId('adminProductImage').setCustomValidity('La imagen debe usar HTTPS.');
    byId('adminProductImage').reportValidity();
    byId('adminProductImage').setCustomValidity('');
    return;
  }
  const productId = byId('adminProductId').value;
  const payload = {
    name: byId('adminProductName').value.trim(),
    displayName: byId('adminProductDisplayName').value.trim(),
    brand: byId('adminProductBrand').value.trim(),
    categoryId: byId('adminProductCategory').value,
    priceCop: Number(byId('adminProductPrice').value),
    imageUrl,
  };
  const submit = byId('adminProductSubmit');
  submit.disabled = true;
  try {
    await adminApi(productId ? `/admin/catalog/products/${productId}` : '/admin/catalog/products', {
      method: productId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    state.dirtyPrices.delete(productId);
    state.catalogChanged = true;
    resetProductForm();
    setFormOpen('adminProductForm', 'adminAddProductToggle', false);
    await loadAdminCatalog();
    showToast(productId ? 'Producto actualizado.' : 'Producto creado.');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
}

async function setProductActive(productId, active) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  if (!active && !window.confirm(`¿Desactivar “${product.displayName}”? Podrás restaurarlo después.`)) return;
  try {
    await adminApi(`/admin/catalog/products/${productId}${active ? '/restore' : ''}`, {
      method: active ? 'POST' : 'DELETE',
    });
    state.dirtyPrices.delete(productId);
    state.catalogChanged = true;
    await loadAdminCatalog();
    if (!active) {
      showToast('Producto desactivado.', {
        label: 'Deshacer',
        run: async () => {
          await adminApi(`/admin/catalog/products/${productId}/restore`, { method: 'POST' });
          await loadAdminCatalog();
          showToast('Producto restaurado.');
        },
      });
    } else showToast('Producto restaurado.');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function categoryPayload(category = null) {
  return {
    slug: byId('adminCategorySlug').value.trim(),
    navLabel: byId('adminCategoryNavLabel').value.trim(),
    adminLabel: byId('adminCategoryAdminLabel').value.trim(),
    icon: byId('adminCategoryIcon').value.trim(),
    title: byId('adminCategoryTitle').value.trim(),
    subtitle: byId('adminCategorySubtitle').value.trim(),
    sortOrder: Number(byId('adminCategoryOrder').value),
    ...(category ? { active: category.active } : {}),
  };
}

function resetCategoryForm() {
  byId('adminCategoryForm').reset();
  byId('adminCategoryId').value = '';
  byId('adminCategoryIcon').value = 'fa-star';
  byId('adminCategoryOrder').value = '0';
  byId('adminCategoryFormHeading').textContent = 'Agregar categoría';
  byId('adminCategoryCancel').hidden = true;
}

function editCategory(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) return;
  byId('adminCategoryId').value = category.id;
  byId('adminCategorySlug').value = category.slug;
  byId('adminCategoryNavLabel').value = category.navLabel;
  byId('adminCategoryAdminLabel').value = category.adminLabel;
  byId('adminCategoryIcon').value = category.icon;
  byId('adminCategoryTitle').value = category.title;
  byId('adminCategorySubtitle').value = category.subtitle;
  byId('adminCategoryOrder').value = category.sortOrder;
  byId('adminCategoryFormHeading').textContent = 'Editar categoría';
  byId('adminCategoryCancel').hidden = false;
  setFormOpen('adminCategoryForm', 'adminAddCategoryToggle', true);
  byId('adminCategorySlug').focus();
}

async function submitCategory(event) {
  event.preventDefault();
  const form = byId('adminCategoryForm');
  if (!form.reportValidity()) return;
  const categoryId = byId('adminCategoryId').value;
  const category = state.categories.find((item) => item.id === categoryId);
  try {
    await adminApi(categoryId ? `/admin/catalog/categories/${categoryId}` : '/admin/catalog/categories', {
      method: categoryId ? 'PATCH' : 'POST',
      body: JSON.stringify(categoryPayload(category)),
    });
    state.catalogChanged = true;
    resetCategoryForm();
    setFormOpen('adminCategoryForm', 'adminAddCategoryToggle', false);
    await loadAdminCatalog();
    showToast(categoryId ? 'Categoría actualizada.' : 'Categoría creada.');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function setCategoryActive(categoryId, active) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) return;
  if (!active && !window.confirm(`¿Desactivar la categoría “${category.adminLabel}”?`)) return;
  try {
    if (active) {
      await adminApi(`/admin/catalog/categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          slug: category.slug,
          navLabel: category.navLabel,
          adminLabel: category.adminLabel,
          icon: category.icon,
          title: category.title,
          subtitle: category.subtitle,
          sortOrder: category.sortOrder,
          active: true,
        }),
      });
    } else {
      await adminApi(`/admin/catalog/categories/${categoryId}`, { method: 'DELETE' });
    }
    state.catalogChanged = true;
    await loadAdminCatalog();
    showToast(active ? 'Categoría restaurada.' : 'Categoría desactivada.');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function savePrices() {
  if (!state.dirtyPrices.size) return;
  const updates = [...state.dirtyPrices].map(([productId, priceCop]) => ({ productId, priceCop }));
  const button = byId('adminSavePricesBtn');
  button.disabled = true;
  try {
    await adminApi('/admin/catalog/prices', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
    for (const [productId, priceCop] of state.dirtyPrices) {
      const product = state.products.find((item) => item.id === productId);
      if (product) product.price = priceCop;
    }
    state.dirtyPrices.clear();
    state.catalogChanged = true;
    renderProducts();
    setStatus('Precios guardados en PostgreSQL. El catálogo se actualizará al cerrar.', 'success');
    showToast('Cambios de precio guardados.');
  } catch (error) {
    setStatus(error.message, 'error');
    updateSaveButton();
  }
}

function bulkMultiply() {
  const multiplier = Number(byId('adminBulkMultiplier').value);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    setStatus('El multiplicador debe ser mayor que cero.', 'error');
    return;
  }
  const products = visibleProducts().filter((product) => product.active);
  if (!products.length) return;
  for (const product of products) {
    const base = state.dirtyPrices.get(product.id) ?? product.price;
    state.dirtyPrices.set(product.id, Math.round(base * multiplier));
  }
  renderProducts();
  showToast(`${products.length} precios preparados. Falta guardarlos.`);
}

async function resetVisiblePrices() {
  const products = visibleProducts().filter((product) => product.active);
  if (!products.length || !window.confirm(`¿Restaurar el precio inicial de ${products.length} productos visibles?`)) return;
  try {
    await adminApi('/admin/catalog/prices/reset', {
      method: 'POST',
      body: JSON.stringify({ productIds: products.map((product) => product.id) }),
    });
    products.forEach((product) => state.dirtyPrices.delete(product.id));
    state.catalogChanged = true;
    await loadAdminCatalog();
    showToast('Precios visibles restaurados.');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function downloadCatalogExport() {
  const payload = {
    format: 'glam-studio-catalog-v1',
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    products: state.products,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `glam-studio-catalogo-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function trapPanelFocus(event) {
  if (event.key !== 'Tab') return;
  const overlay = byId('adminPanelOverlay');
  const controls = [...overlay.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.offsetParent !== null);
  if (!controls.length) return;
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

export async function openAdminPanel() {
  const overlay = byId('adminPanelOverlay');
  previousFocus = document.activeElement;
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('admin-open');
  byId('adminPanelTitle').focus();
  try {
    await loadAdminCatalog();
  } catch (error) {
    setStatus(`No se pudo cargar el catálogo: ${error.message}`, 'error');
  }
}

export function closeAdminPanel() {
  if (state.dirtyPrices.size && !window.confirm('Hay cambios de precio sin guardar. ¿Cerrar y descartarlos?')) return;
  const overlay = byId('adminPanelOverlay');
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('admin-open');
  previousFocus?.focus?.();
  if (state.catalogChanged) window.location.reload();
}

export function initAdminPanel() {
  if (initialized) return;
  initialized = true;
  byId('adminCloseBtn').addEventListener('click', closeAdminPanel);
  byId('adminCatTabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category-id]');
    if (!button) return;
    state.activeCategoryId = button.dataset.categoryId;
    renderCategoryTabs();
    renderProducts();
  });
  byId('adminSearchInput').addEventListener('input', (event) => {
    state.query = event.target.value.trim();
    renderProducts();
  });
  byId('adminProductList').addEventListener('input', (event) => {
    const input = event.target.closest('.admin-price-input');
    if (!input) return;
    const product = state.products.find((item) => item.id === input.dataset.productId);
    const price = Number(input.value);
    if (!product || !Number.isInteger(price) || price < 0 || price > 100000000) {
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    input.removeAttribute('aria-invalid');
    if (price === product.price) state.dirtyPrices.delete(product.id);
    else state.dirtyPrices.set(product.id, price);
    input.closest('.admin-product-row').classList.toggle('modified', state.dirtyPrices.has(product.id));
    updateSaveButton();
  });
  byId('adminProductList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'edit') editProduct(button.dataset.productId);
    else setProductActive(button.dataset.productId, button.dataset.action === 'restore');
  });
  byId('adminCategoryList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category-action]');
    if (!button) return;
    if (button.dataset.categoryAction === 'edit') editCategory(button.dataset.categoryId);
    else setCategoryActive(button.dataset.categoryId, button.dataset.categoryAction === 'restore');
  });
  byId('adminBulkMultiplier').addEventListener('input', (event) => {
    byId('adminBulkDisplay').textContent = event.target.value;
  });
  byId('adminBulkBtn').addEventListener('click', bulkMultiply);
  byId('adminResetBtn').addEventListener('click', resetVisiblePrices);
  byId('adminSavePricesBtn').addEventListener('click', savePrices);
  byId('adminExportBtn').addEventListener('click', downloadCatalogExport);
  byId('adminAddProductToggle').addEventListener('click', () => {
    const open = !byId('adminProductForm').classList.contains('open');
    if (open && !byId('adminProductId').value) resetProductForm();
    setFormOpen('adminProductForm', 'adminAddProductToggle', open);
  });
  byId('adminProductForm').addEventListener('submit', submitProduct);
  byId('adminProductCancel').addEventListener('click', () => {
    resetProductForm();
    setFormOpen('adminProductForm', 'adminAddProductToggle', false);
  });
  byId('adminProductImage').addEventListener('input', (event) => {
    const image = byId('adminProductImgPreview');
    const visible = event.target.value.startsWith('https://');
    if (visible) image.src = event.target.value;
    image.classList.toggle('visible', visible);
  });
  byId('adminAddCategoryToggle').addEventListener('click', () => {
    const open = !byId('adminCategoryForm').classList.contains('open');
    if (open && !byId('adminCategoryId').value) resetCategoryForm();
    setFormOpen('adminCategoryForm', 'adminAddCategoryToggle', open);
  });
  byId('adminCategoryForm').addEventListener('submit', submitCategory);
  byId('adminCategoryCancel').addEventListener('click', () => {
    resetCategoryForm();
    setFormOpen('adminCategoryForm', 'adminAddCategoryToggle', false);
  });
  const legacyButton = byId('adminLegacyBackupBtn');
  legacyButton.hidden = !hasLegacyCatalogData();
  legacyButton.addEventListener('click', () => {
    downloadLegacyBackup();
    showToast('Respaldo local descargado. No se eliminó ningún dato del navegador.');
  });
  document.addEventListener('keydown', (event) => {
    if (!byId('adminPanelOverlay')?.classList.contains('active')) return;
    if (event.key === 'Escape') closeAdminPanel();
    else trapPanelFocus(event);
  });
  resetProductForm();
  resetCategoryForm();
  updateSaveButton();
}
