import { categories } from '../data/categories.js';
import { products } from '../data/products.js';
import { ProductSection } from './ProductSection.js';

export function Catalog(catalogCategories = categories, catalogProducts = products) {
  return catalogCategories.map((category) => ProductSection(
    category,
    catalogProducts.filter((product) => product.category === (category.slug || category.id))
  )).join('');
}
