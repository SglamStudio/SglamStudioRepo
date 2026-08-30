import { ProductCard } from './ProductCard.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';

export function ProductSection(category, products) {
  const categorySlug = category.slug || category.id;
  const subtitle = category.subtitle ? `<p>${escapeHtml(category.subtitle)}</p>` : '';
  return `<section class="catalog-category">
    <div class="category-banner category-banner--flush" id="${escapeAttribute(categorySlug)}">
      <h2><i class="fas ${escapeAttribute(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.title)}</h2>${subtitle}
    </div>
    <div class="products-section">
      <div class="products-grid" id="${escapeAttribute(category.gridId || `${categorySlug}Grid`)}">
        ${products.map(ProductCard).join('')}
      </div>
    </div>
  </section>`;
}
