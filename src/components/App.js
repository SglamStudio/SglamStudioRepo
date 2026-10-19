import { Header } from './Header.js';
import { Hero } from './Hero.js';
import { CategoryNav } from './CategoryNav.js';
import { Catalog } from './Catalog.js';
import { Footer } from './Footer.js';
import { Cart } from './Cart.js';
import { CheckoutModal } from './CheckoutModal.js';
import { Feedback } from './Feedback.js';

export function App({ categories = [], products = [] } = {}) {
  // Solo se muestran las categorías que tienen productos.
  const visibleCategories = categories.filter((category) => (
    products.some((product) => product.category === (category.slug || category.id))
  ));
  return [
    Header(),
    Hero(products),
    CategoryNav(visibleCategories),
    Catalog(visibleCategories, products),
    Footer(),
    Cart(),
    CheckoutModal(),
    Feedback()
  ].join('');
}
