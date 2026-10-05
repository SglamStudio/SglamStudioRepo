import { categories } from '../data/categories.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';

export function CategoryNav(catalogCategories = categories) {
  return `<nav class="category-pills" id="categorias" aria-label="Categorías de productos">
    <div class="category-pills__track" id="categoryNav">
      <button class="pill is-active" type="button" data-filter="todo" aria-pressed="true">Todo</button>${catalogCategories.map((category) => `
      <button class="pill" type="button" data-filter="${escapeAttribute(category.slug || category.id)}" aria-pressed="false">${escapeHtml(category.navLabel)}</button>`).join('')}
    </div>
  </nav>`;
}
