const BRAND_CANONICAL_NAMES = new Map([
  ['huxiabeauty', 'HuxiaBeauty'],
  ['myk', 'MYK'],
  ['ani-k', 'ANI-K'],
  ['enchante', 'Enchanté'],
]);

export function normalizeBrandAlias(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');
}

export function canonicalBrandName(value) {
  const cleaned = String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  return BRAND_CANONICAL_NAMES.get(normalizeBrandAlias(cleaned)) ?? cleaned;
}

export function slugifyCatalogValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';
}

export function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function auditCatalogSource(categories, products) {
  const categorySlugs = new Set(categories.map((category) => category.id));
  const canonicalBrands = new Set();
  const productKeys = new Set();
  const duplicateProducts = [];
  const invalidImages = [];
  const invalidPrices = [];
  const orphanProducts = [];

  products.forEach((product, index) => {
    const canonicalBrand = canonicalBrandName(product.brand);
    canonicalBrands.add(canonicalBrand);

    const key = [
      normalizeBrandAlias(canonicalBrand),
      product.category,
      String(product.name ?? '').normalize('NFC').trim().toLocaleLowerCase('es'),
    ].join('::');

    if (productKeys.has(key)) duplicateProducts.push({ index, key, product });
    productKeys.add(key);

    if (!isHttpsUrl(product.image)) invalidImages.push({ index, image: product.image });
    if (!Number.isInteger(product.price) || product.price < 0) {
      invalidPrices.push({ index, price: product.price });
    }
    if (!categorySlugs.has(product.category)) {
      orphanProducts.push({ index, category: product.category });
    }
  });

  return {
    categoryCount: categorySlugs.size,
    brandCount: canonicalBrands.size,
    productCount: products.length,
    primaryImageCount: products.length - invalidImages.length,
    currentPriceCount: products.length - invalidPrices.length,
    duplicateProducts,
    invalidImages,
    invalidPrices,
    orphanProducts,
  };
}

export function assertValidCatalogSource(categories, products) {
  const report = auditCatalogSource(categories, products);
  const failures = [];

  if (report.categoryCount !== 5) failures.push(`categorías: ${report.categoryCount} (esperadas: 5)`);
  if (report.brandCount !== 72) failures.push(`marcas canónicas: ${report.brandCount} (esperadas: 72)`);
  if (report.productCount !== 197) failures.push(`productos: ${report.productCount} (esperados: 197)`);
  if (report.invalidImages.length) failures.push(`imágenes HTTPS inválidas: ${report.invalidImages.length}`);
  if (report.invalidPrices.length) failures.push(`precios inválidos: ${report.invalidPrices.length}`);
  if (report.orphanProducts.length) failures.push(`productos huérfanos: ${report.orphanProducts.length}`);
  if (report.duplicateProducts.length) failures.push(`productos duplicados: ${report.duplicateProducts.length}`);

  if (failures.length) {
    throw new Error(`El catálogo fuente no superó la validación:\n- ${failures.join('\n- ')}`);
  }

  return report;
}
