import { escapeAttribute, escapeHtml } from '../utils/html.js';

// Productos reales del catálogo que componen la imagen de portada.
const SHOWCASE_SLOTS = [
  /(l[áa]piz de labios|labial|lip ?gloss|brillo labial)/i,
  /(rubor|polvo compacto)/i,
  /(base l[íi]quida|base )/i,
  /(set de brochas|brocha)/i
];

function pickShowcase(products) {
  const used = new Set();
  const picks = [];
  for (const pattern of SHOWCASE_SLOTS) {
    const match = products.find((product) => (
      product.image && !used.has(product) && pattern.test(product.displayName || product.name || '')
    ));
    if (match) {
      used.add(match);
      picks.push(match);
    }
  }
  return picks;
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
