import { categories } from '../data/categories.js';
import { products } from '../data/products.js';
import { ProductSection } from './ProductSection.js';
import { SearchInfo } from './SearchBar.js';
import { BrandPanel } from './BrandPanel.js';

export function Catalog(catalogCategories = categories, catalogProducts = products) {
  const sections = catalogCategories.map((category) => ProductSection(
    category,
    catalogProducts.filter((product) => product.category === (category.slug || category.id))
  )).join('');
  return `<main class="shop" id="catalogo"><div class="shop__content">${SearchInfo()}${sections}</div>${BrandPanel(catalogProducts)}</main>`;
}
