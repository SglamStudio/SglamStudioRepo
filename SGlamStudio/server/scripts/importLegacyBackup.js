import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../db.js';
import {
  createCatalogCategory,
  createCatalogProduct,
  listAdminCategories,
  listAdminProducts,
  setCatalogProductActive,
  updateCatalogCategory,
  updateCatalogPrices,
  updateCatalogProduct,
} from '../services/catalogService.js';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function plainText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function validSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

const file = argumentValue('--file');
if (!file) throw new Error('Uso: npm run catalog:import-legacy -- --file ruta/al/respaldo.json');

const raw = await fs.readFile(path.resolve(file), 'utf8');
const backup = JSON.parse(raw);
if (backup.format !== 'glam-studio-legacy-localstorage-v1' || !backup.data) {
  throw new Error('El archivo no es un respaldo legado válido de Glam Studio.');
}

const customCategories = backup.data.glam_custom_categories || [];
const customProducts = backup.data.glam_custom_products || [];
const deletedNames = backup.data.glam_deleted_products || [];
const priceOverrides = backup.data.glam_price_overrides || {};
const report = {
  categoriesUpserted: 0,
  productsUpserted: 0,
  pricesUpdated: 0,
  productsDeactivated: 0,
  skipped: [],
};

try {
  let categories = await listAdminCategories();
  for (const [index, category] of customCategories.entries()) {
    const slug = String(category.id || category.slug || '').trim().toLowerCase();
    if (!validSlug(slug)) {
      report.skipped.push(`Categoría ${index + 1}: identificador inválido.`);
      continue;
    }
    const existing = categories.find((item) => item.slug === slug);
    const payload = {
      slug,
      navLabel: plainText(category.navLabel || category.name || slug),
      adminLabel: plainText(category.adminLabel || category.name || slug),
      icon: plainText(category.icon || 'fa-star').slice(0, 40),
      title: plainText(category.title || category.name || slug),
      subtitle: plainText(category.subtitle || ''),
      sortOrder: Number.isInteger(category.sortOrder) ? category.sortOrder : categories.length + index,
    };
    if (existing) await updateCatalogCategory(existing.id, { ...payload, active: true });
    else await createCatalogCategory(payload);
    report.categoriesUpserted += 1;
  }

  categories = await listAdminCategories();
  let products = await listAdminProducts();
  for (const [index, product] of customProducts.entries()) {
    const category = categories.find((item) => item.slug === product.category && item.active);
    const priceCop = Number(product.price);
    if (!category || !Number.isInteger(priceCop) || priceCop < 0 || !String(product.image || '').startsWith('https://')) {
      report.skipped.push(`Producto ${index + 1} (${plainText(product.name)}): categoría, precio o imagen inválidos.`);
      continue;
    }
    const payload = {
      name: plainText(product.name),
      displayName: plainText(product.displayName || product.name),
      brand: plainText(product.brand),
      categoryId: category.id,
      priceCop,
      imageUrl: product.image,
    };
    const existing = products.find((item) =>
      item.name === payload.name
      && item.brand.toLocaleLowerCase('es') === payload.brand.toLocaleLowerCase('es')
      && item.categoryId === category.id
    );
    if (existing) {
      await updateCatalogProduct(existing.id, payload, null);
      if (!existing.active) await setCatalogProductActive(existing.id, true);
    } else await createCatalogProduct(payload, null);
    report.productsUpserted += 1;
  }

  products = await listAdminProducts();
  const priceUpdates = [];
  for (const [name, override] of Object.entries(priceOverrides)) {
    const matches = products.filter((product) => product.name === name);
    const priceCop = Number(override?.price);
    if (matches.length !== 1 || !Number.isInteger(priceCop) || priceCop < 0) {
      report.skipped.push(`Precio de “${plainText(name)}”: coincidencia ambigua o valor inválido.`);
      continue;
    }
    priceUpdates.push({ productId: matches[0].id, priceCop });
  }
  if (priceUpdates.length) {
    await updateCatalogPrices(priceUpdates, null);
    report.pricesUpdated = priceUpdates.length;
  }

  for (const name of deletedNames) {
    const matches = products.filter((product) => product.name === name && product.active);
    if (!matches.length) {
      report.skipped.push(`Eliminado legado “${plainText(name)}”: no se encontró un producto activo.`);
      continue;
    }
    for (const product of matches) {
      await setCatalogProductActive(product.id, false);
      report.productsDeactivated += 1;
    }
  }

  console.log('Importación legada completada. El archivo y el localStorage original no fueron eliminados.');
  console.table({
    categoriesUpserted: report.categoriesUpserted,
    productsUpserted: report.productsUpserted,
    pricesUpdated: report.pricesUpdated,
    productsDeactivated: report.productsDeactivated,
    skipped: report.skipped.length,
  });
  if (report.skipped.length) console.log(report.skipped.join('\n'));
} finally {
  await pool.end();
}
