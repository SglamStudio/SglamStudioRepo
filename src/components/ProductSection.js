import { ProductCard } from './ProductCard.js';
import { escapeAttribute } from '../utils/html.js';

export function ProductSection(category, products) {
  const subtitle = category.subtitle ? `<p>${category.subtitle}</p>` : '';
  return `<section class="catalog-category">
    <div class="category-banner category-banner--flush" id="${escapeAttribute(category.id)}">
      <h2>${category.title}</h2>${subtitle}
    </div>
    <div class="products-section">
      <div class="products-grid" id="${escapeAttribute(category.gridId)}">
        ${products.map(ProductCard).join('')}
      </div>
    </div>
  </section>`;
}
