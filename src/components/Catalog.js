import { categories } from '../data/categories.js';
import { products } from '../data/products.js';
import { ProductSection } from './ProductSection.js';

export function Catalog() {
  return categories.map((category) => ProductSection(
    category,
    products.filter((product) => product.category === category.id)
  )).join('');
}
