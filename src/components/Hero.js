import { escapeAttribute, escapeHtml } from '../utils/html.js';

// Cuatro productos cualquiera del catálogo, distintos en cada visita.
function pickShowcase(products) {
  const pool = products.filter((product) => product.image);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4);
}

function countBrands(products) {
  return new Set(products.map((product) => (product.displayBrand || product.brand || '').trim().toLowerCase()).filter(Boolean)).size;
}

export function Hero(products = []) {
  const shots = pickShowcase(products);
  const brands = countBrands(products);
  const facts = [
    brands ? `${brands} marcas` : '',
    'Pedido por WhatsApp',
    'Transferencia o efectivo'
  ].filter(Boolean);

  return `<section class="hero" aria-labelledby="heroTitle">
    <div class="hero__copy">
      <h1 id="heroTitle">Tu rutina de belleza, más fácil</h1>
      <p>Maquillaje, brochas y cuidado para tu rostro. Elige tus favoritos, arma tu pedido y envíalo directo por WhatsApp.</p>
      <a class="hero__cta" href="#catalogo">Comprar ahora <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
      <ul class="hero__facts">${facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>
    </div>
    <div class="hero__visual" aria-hidden="true">
      <span class="hero__blob hero__blob--a"></span>
      <span class="hero__blob hero__blob--b"></span>
      ${shots.map((product, index) => `<figure class="hero-shot hero-shot--${index + 1}"><img src="${escapeAttribute(product.image)}" alt="" referrerpolicy="no-referrer" decoding="async"></figure>`).join('')}
    </div>
  </section>`;
}
