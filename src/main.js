import './styles/base.css';
import './styles/header.css';
import './styles/catalog.css';
import './styles/cart.css';
import './styles/layout.css';
import './styles/navigation.css';
import './styles/admin.css';
import { App } from './components/App.js';

document.querySelector('#app').innerHTML = App();

await import('./features/storefront.js');
await import('./features/imageLoader.js');
await import('./features/priceMigration.js');
await import('./features/adminAccess.js');
