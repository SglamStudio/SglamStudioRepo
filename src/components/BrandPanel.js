import { storeConfig } from '../config/store.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';
import { brandKey } from '../utils/brandKey.js';

const MAX_BRANDS = 10;

// Marcas destacadas: las de storeConfig.featuredBrands (en ese orden) o,
// si esa lista está vacía, las 10 con más productos en el catálogo.
function featuredBrands(products) {
  const brands = new Map();
  for (const product of products) {
    const name = (product.displayBrand || product.brand || '').trim();
    if (!name) continue;
    const key = brandKey(name);
    const entry = brands.get(key) || { name, key, count: 0 };
    entry.count += 1;
    brands.set(key, entry);
  }
  const wanted = (storeConfig.featuredBrands || []).map(brandKey);
  if (wanted.length) {
    return wanted.map((key) => brands.get(key)).filter(Boolean).slice(0, MAX_BRANDS);
  }
  return [...brands.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
    .slice(0, MAX_BRANDS);
}

export function BrandPanel(products = []) {
  const brands = featuredBrands(products);
  if (!brands.length) return '';
  return `<aside class="brand-panel" id="marcas" aria-labelledby="brandPanelTitle">
    <h2 class="brand-panel__title" id="brandPanelTitle">Marcas</h2>
    <div class="brand-panel__list" id="brandPanel">
      <button class="brand-link is-active" type="button" data-brand="" aria-pressed="true"><span>Todas</span></button>${brands.map((brand) => `
      <button class="brand-link" type="button" data-brand="${escapeAttribute(brand.key)}" aria-pressed="false"><span>${escapeHtml(brand.name)}</span><small>${brand.count}</small></button>`).join('')}
    </div>
  </aside>`;
}
