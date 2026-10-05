import { ProductCard } from './ProductCard.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';

function cleanTitle(category) {
  const title = String(category.title || '').replace(/[♡♥❤]/g, '').replace(/\s+/g, ' ').trim();
  return title || category.navLabel || '';
}

export function ProductSection(category, products) {
  const slug = category.slug || category.id;
  const subtitle = category.subtitle ? `<p>${escapeHtml(category.subtitle)}</p>` : '';
  const count = products.length;
  return `<section class="catalog-category" id="${escapeAttribute(slug)}" data-category="${escapeAttribute(slug)}" aria-labelledby="${escapeAttribute(slug)}-title">
    <div class="category-head">
      <div>
        <h2 id="${escapeAttribute(slug)}-title">${escapeHtml(cleanTitle(category))}</h2>${subtitle}
      </div>
      <span class="category-count">${count} producto${count === 1 ? '' : 's'}</span>
    </div>
    <div class="products-grid" id="${escapeAttribute(category.gridId || `${slug}Grid`)}">
      ${products.map(ProductCard).join('')}
    </div>
  </section>`;
}
