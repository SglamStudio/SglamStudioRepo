import { categories } from '../data/categories.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';

export function CategoryNav() {
  return `<nav class="category-nav" id="categoryNav">
    <button class="category-menu-toggle" id="categoryMenuToggle" type="button" aria-expanded="false" aria-controls="categoryNavLinks">
      <i class="fas fa-bars category-menu-icon" aria-hidden="true"></i>
      <span>Categorías</span>
      <i class="fas fa-chevron-down category-menu-chevron" aria-hidden="true"></i>
    </button>
    <div class="category-nav-links" id="categoryNavLinks">${categories.map((category, index) => `
      ${index ? '<div class="nav-divider"></div>' : ''}
      <a class="nav-btn" href="#${escapeAttribute(category.id)}" data-target="${escapeAttribute(category.id)}">
        <i class="fas ${escapeAttribute(category.icon)}"></i> ${escapeHtml(category.navLabel)}
      </a>`).join('')}
    </div>
  </nav>`;
}
