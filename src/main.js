import './styles/base.css';
import './styles/header.css';
import './styles/catalog.css';
import './styles/cart.css';
import './styles/layout.css';
import './styles/navigation.css';
import './styles/admin.css';
import { App } from './components/App.js';
import { categories as localCategories } from './data/categories.js';
import { products as localProducts } from './data/products.js';

async function loadCatalogFromApi() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    fetch('/api/catalog/categories', { headers: { Accept: 'application/json' }, credentials: 'same-origin' }),
    fetch('/api/catalog/products', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
  ]);
  if (!categoriesResponse.ok || !productsResponse.ok) throw new Error('No se pudo cargar el catálogo remoto.');
  const categoriesPayload = await categoriesResponse.json();
  const productsPayload = await productsResponse.json();
  if (!categoriesPayload.categories?.length || !productsPayload.products?.length) {
    throw new Error('Supabase aún no tiene productos cargados.');
  }
  return { categories: categoriesPayload.categories, products: productsPayload.products, source: 'remote' };
}

let catalogData = { categories: localCategories, products: localProducts, source: 'local' };
let catalogError = '';
try {
  catalogData = await loadCatalogFromApi();
} catch (error) {
  catalogError = error.message;
  console.warn('Se mostrará una copia local de emergencia; sus precios podrían estar desactualizados.', error.message);
}

window.catalogSource = catalogData.source;
document.querySelector('#app').innerHTML = App(catalogData);

if (catalogData.source !== 'remote') {
  const status = document.createElement('div');
  status.className = 'catalog-status catalog-status--warning';
  status.setAttribute('role', 'alert');
  const message = document.createElement('span');
  message.textContent = `Catálogo temporal: no fue posible consultar la base de datos. ${catalogError}`;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Reintentar';
  retry.addEventListener('click', () => window.location.reload());
  status.append(message, retry);
  document.body.prepend(status);
}

await import('./features/storefront.js');
await import('./features/imageLoader.js');
await import('./features/adminAccess.js');
