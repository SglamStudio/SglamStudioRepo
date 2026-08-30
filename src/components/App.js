import { Header } from './Header.js';
import { CategoryNav } from './CategoryNav.js';
import { SearchBar } from './SearchBar.js';
import { Catalog } from './Catalog.js';
import { Footer } from './Footer.js';
import { Cart } from './Cart.js';
import { CheckoutModal } from './CheckoutModal.js';
import { Feedback } from './Feedback.js';

export function App() {
  return [Header(), CategoryNav(), SearchBar(), Catalog(), Footer(), Cart(), CheckoutModal(), Feedback()].join('');
}
