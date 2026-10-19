import { storeConfig } from '../config/store.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';
import { brandKey } from '../utils/brandKey.js';

const MAX_FEATURED = 10;

// Primero las marcas destacadas: las de storeConfig.featuredBrands (en ese orden)
// o, si esa lista está vacía, las 10 con más productos. Después, el resto en orden alfabético.
function groupBrands(products) {
  const brands = new Map();
  for (const product of products) {
    const name = (product.displayBrand || product.brand || '').trim();
    if (!name) continue;
    const key = brandKey(name);
    const entry = brands.get(key) || { name, key, count: 0 };
    entry.count += 1;
    brands.set(key, entry);
  }
  const all = [...brands.values()];
  const wanted = (storeConfig.featuredBrands || []).map(brandKey);
  const featured = wanted.length
    ? wanted.map((key) => brands.get(key)).filter(Boolean).slice(0, MAX_FEATURED)
    : [...all].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es')).slice(0, MAX_FEATURED);
  const used = new Set(featured.map((brand) => brand.key));
  const others = all.filter((brand) => !used.has(brand.key)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { featured, others };
}

export function BrandPanel(products = []) {
  const { featured, others } = groupBrands(products);
  if (!featured.length && !others.length) return '';
  const button = (brand) => `
      <button class="brand-link" type="button" data-brand="${escapeAttribute(brand.key)}" aria-pressed="false"><span>${escapeHtml(brand.name)}</span><small>${brand.count}</small></button>`;
  return `<aside class="brand-panel" id="marcas" aria-labelledby="brandPanelTitle">
    <h2 class="brand-panel__title" id="brandPanelTitle">
      <button class="brand-panel__toggle" id="brandPanelToggle" type="button" aria-expanded="false" aria-controls="brandPanel"><span id="brandPanelLabel">Marcas</span><i class="brand-panel__chevron" aria-hidden="true"></i></button>
    </h2>
    <div class="brand-panel__list" id="brandPanel" hidden>
      <button class="brand-link is-active" type="button" data-brand="" aria-pressed="true"><span>Todas</span></button>${featured.map(button).join('')}${others.length ? `
      <p class="brand-panel__sub">Otras marcas</p>${others.map(button).join('')}` : ''}
    </div>
  </aside>`;
}
