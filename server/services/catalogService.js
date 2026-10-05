import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import {
  canonicalBrandName,
  normalizeBrandAlias,
  slugifyCatalogValue,
} from '../../shared/catalogNormalization.js';

const PRODUCT_SELECT = `
  SELECT
    p.id, p.name, p.display_name, p.active, p.created_at, p.updated_at,
    c.id AS category_id, c.slug AS category_slug, c.nav_label AS category_label,
    b.id AS brand_id, b.name AS brand_name,
    image.url AS image_url, image.alt_text,
    second_image.url AS second_image_url,
    current_price.price_cop,
    initial_price.price_cop AS initial_price_cop
  FROM catalog_products p
  JOIN catalog_categories c ON c.id = p.category_id
  JOIN catalog_brands b ON b.id = p.brand_id
  LEFT JOIN LATERAL (
    SELECT url, alt_text FROM catalog_product_images
    WHERE product_id = p.id AND is_primary = TRUE LIMIT 1
  ) image ON TRUE
  LEFT JOIN LATERAL (
    SELECT url FROM catalog_product_images
    WHERE product_id = p.id AND is_primary = FALSE
    ORDER BY sort_order, created_at LIMIT 1
  ) second_image ON TRUE
  LEFT JOIN LATERAL (
    SELECT price_cop FROM catalog_price_history
    WHERE product_id = p.id AND valid_to IS NULL LIMIT 1
  ) current_price ON TRUE
  LEFT JOIN LATERAL (
    SELECT price_cop FROM catalog_price_history
    WHERE product_id = p.id ORDER BY valid_from ASC, created_at ASC LIMIT 1
  ) initial_price ON TRUE`;

export function mapAdminProduct(row) {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    active: row.active,
    brandId: row.brand_id,
    brand: row.brand_name,
    categoryId: row.category_id,
    category: row.category_slug,
    categoryLabel: row.category_label,
    price: row.price_cop,
    initialPrice: row.initial_price_cop,
    image: row.image_url || '',
    imageAlt: row.alt_text || '',
    secondImage: row.second_image_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchProductById(client, productId) {
  const result = await client.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [productId]);
  if (!result.rowCount) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.');
  return mapAdminProduct(result.rows[0]);
}

export async function listAdminProducts() {
  const result = await pool.query(
    `${PRODUCT_SELECT}
     ORDER BY c.sort_order, c.slug, p.active DESC, p.name`
  );
  return result.rows.map(mapAdminProduct);
}

export async function listAdminCategories() {
  const result = await pool.query(
    `SELECT
       c.id, c.slug, c.nav_label, c.admin_label, c.icon, c.title, c.subtitle,
       c.sort_order, c.active, c.created_at, c.updated_at,
       COUNT(p.id)::int AS product_count,
       COUNT(p.id) FILTER (WHERE p.active)::int AS active_product_count
     FROM catalog_categories c
     LEFT JOIN catalog_products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order, c.slug`
  );
  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    navLabel: row.nav_label,
    adminLabel: row.admin_label,
    icon: row.icon,
    title: row.title,
    subtitle: row.subtitle,
    sortOrder: row.sort_order,
    active: row.active,
    productCount: row.product_count,
    activeProductCount: row.active_product_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function nextPriceTimestamp(currentValidFrom) {
  return new Date(Math.max(Date.now(), new Date(currentValidFrom).getTime() + 1));
}

async function setCurrentPrice(client, productId, priceCop, deviceId, reason) {
  const product = await client.query(
    `SELECT id FROM catalog_products WHERE id = $1 FOR UPDATE`,
    [productId]
  );
  if (!product.rowCount) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.');

  const current = await client.query(
    `SELECT id, price_cop, valid_from FROM catalog_price_history
     WHERE product_id = $1 AND valid_to IS NULL
     FOR UPDATE`,
    [productId]
  );
  if (current.rowCount && current.rows[0].price_cop === priceCop) return false;

  const changedAt = current.rowCount
    ? nextPriceTimestamp(current.rows[0].valid_from)
    : new Date();
  if (current.rowCount) {
    await client.query(
      `UPDATE catalog_price_history SET valid_to = $2 WHERE id = $1`,
      [current.rows[0].id, changedAt]
    );
  }
  await client.query(
    `INSERT INTO catalog_price_history
      (id, product_id, price_cop, valid_from, changed_by_device_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), productId, priceCop, changedAt, deviceId, reason]
  );
  return true;
}

export async function updateCatalogPrices(updates, deviceId) {
  return withTransaction(async (client) => {
    const changed = [];
    for (const update of updates) {
      await setCurrentPrice(
        client,
        update.productId,
        update.priceCop,
        deviceId,
        'Edición desde el panel administrador'
      );
      changed.push({ id: update.productId, priceCop: update.priceCop });
    }
    return changed;
  });
}

export async function resetCatalogPrices(productIds, deviceId) {
  return withTransaction(async (client) => {
    const reset = [];
    for (const productId of productIds) {
      const initial = await client.query(
        `SELECT price_cop FROM catalog_price_history
         WHERE product_id = $1
         ORDER BY valid_from ASC, created_at ASC
         LIMIT 1`,
        [productId]
      );
      if (!initial.rowCount) {
        throw new AppError(409, 'PRICE_HISTORY_NOT_FOUND', 'El producto no tiene precio inicial.');
      }
      await setCurrentPrice(
        client,
        productId,
        initial.rows[0].price_cop,
        deviceId,
        'Restablecimiento al precio inicial'
      );
      reset.push({ id: productId, priceCop: initial.rows[0].price_cop });
    }
    return reset;
  });
}

async function uniqueBrandSlug(client, name) {
  const base = slugifyCatalogValue(name);
  let slug = base;
  let suffix = 2;
  while ((await client.query(`SELECT 1 FROM catalog_brands WHERE slug = $1`, [slug])).rowCount) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function findOrCreateBrand(client, rawName) {
  const canonicalName = canonicalBrandName(rawName);
  const aliasKey = normalizeBrandAlias(rawName);
  const alias = await client.query(
    `SELECT b.id, b.name FROM catalog_brand_aliases a
     JOIN catalog_brands b ON b.id = a.brand_id
     WHERE a.alias_normalized = $1`,
    [aliasKey]
  );
  if (alias.rowCount) {
    await client.query(`UPDATE catalog_brands SET active = TRUE WHERE id = $1`, [alias.rows[0].id]);
    return alias.rows[0];
  }

  let brand = await client.query(
    `SELECT id, name FROM catalog_brands WHERE name = $1`,
    [canonicalName]
  );
  if (!brand.rowCount) {
    brand = await client.query(
      `INSERT INTO catalog_brands (id, name, slug)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [randomUUID(), canonicalName, await uniqueBrandSlug(client, canonicalName)]
    );
  }
  await client.query(`UPDATE catalog_brands SET active = TRUE WHERE id = $1`, [brand.rows[0].id]);
  await client.query(
    `INSERT INTO catalog_brand_aliases (id, brand_id, alias, alias_normalized)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (alias_normalized) DO UPDATE SET brand_id = EXCLUDED.brand_id, alias = EXCLUDED.alias`,
    [randomUUID(), brand.rows[0].id, rawName, aliasKey]
  );
  return brand.rows[0];
}

async function requireActiveCategory(client, categoryId) {
  const result = await client.query(
    `SELECT id, slug FROM catalog_categories WHERE id = $1 AND active = TRUE`,
    [categoryId]
  );
  if (!result.rowCount) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe o está inactiva.');
  return result.rows[0];
}

async function upsertPrimaryImage(client, productId, imageUrl, altText) {
  await client.query(
    `INSERT INTO catalog_product_images
      (id, product_id, url, alt_text, sort_order, is_primary)
     VALUES ($1, $2, $3, $4, 0, TRUE)
     ON CONFLICT (product_id) WHERE is_primary DO UPDATE SET
       url = EXCLUDED.url,
       alt_text = EXCLUDED.alt_text,
       sort_order = 0`,
    [randomUUID(), productId, imageUrl, altText]
  );
}

async function syncSecondImage(client, productId, imageUrl, altText) {
  await client.query(
    `DELETE FROM catalog_product_images WHERE product_id = $1 AND is_primary = FALSE`,
    [productId]
  );
  if (!imageUrl) return;
  await client.query(
    `INSERT INTO catalog_product_images
      (id, product_id, url, alt_text, sort_order, is_primary)
     VALUES ($1, $2, $3, $4, 1, FALSE)`,
    [randomUUID(), productId, imageUrl, altText]
  );
}

export async function createCatalogProduct(payload, deviceId) {
  return withTransaction(async (client) => {
    await requireActiveCategory(client, payload.categoryId);
    const brand = await findOrCreateBrand(client, payload.brand);
    const result = await client.query(
      `INSERT INTO catalog_products
        (id, brand_id, category_id, name, display_name, active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id`,
      [randomUUID(), brand.id, payload.categoryId, payload.name, payload.displayName || payload.name]
    );
    const productId = result.rows[0].id;
    await upsertPrimaryImage(
      client,
      productId,
      payload.imageUrl,
      `${payload.displayName || payload.name} ${brand.name}`
    );
    await syncSecondImage(
      client,
      productId,
      payload.secondImageUrl,
      `${payload.displayName || payload.name} ${brand.name} (2)`
    );
    await setCurrentPrice(client, productId, payload.priceCop, deviceId, 'Creación del producto');
    return fetchProductById(client, productId);
  });
}

export async function updateCatalogProduct(productId, payload, deviceId) {
  return withTransaction(async (client) => {
    await requireActiveCategory(client, payload.categoryId);
    const brand = await findOrCreateBrand(client, payload.brand);
    const result = await client.query(
      `UPDATE catalog_products SET
         brand_id = $2,
         category_id = $3,
         name = $4,
         display_name = $5
       WHERE id = $1
       RETURNING id`,
      [productId, brand.id, payload.categoryId, payload.name, payload.displayName || payload.name]
    );
    if (!result.rowCount) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.');
    await upsertPrimaryImage(
      client,
      productId,
      payload.imageUrl,
      `${payload.displayName || payload.name} ${brand.name}`
    );
    await syncSecondImage(
      client,
      productId,
      payload.secondImageUrl,
      `${payload.displayName || payload.name} ${brand.name} (2)`
    );
    await setCurrentPrice(client, productId, payload.priceCop, deviceId, 'Edición del producto');
    return fetchProductById(client, productId);
  });
}

export async function setCatalogProductActive(productId, active) {
  const result = await pool.query(
    `UPDATE catalog_products SET active = $2 WHERE id = $1 RETURNING id`,
    [productId, active]
  );
  if (!result.rowCount) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.');
  return { id: productId, active };
}

export async function createCatalogCategory(payload) {
  const result = await pool.query(
    `INSERT INTO catalog_categories
      (id, slug, nav_label, admin_label, icon, title, subtitle, sort_order, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
     RETURNING id`,
    [
      randomUUID(),
      payload.slug,
      payload.navLabel,
      payload.adminLabel,
      payload.icon,
      payload.title,
      payload.subtitle,
      payload.sortOrder,
    ]
  );
  return { ...payload, id: result.rows[0].id, active: true, productCount: 0, activeProductCount: 0 };
}

export async function updateCatalogCategory(categoryId, payload) {
  const result = await pool.query(
    `UPDATE catalog_categories SET
       slug = $2,
       nav_label = $3,
       admin_label = $4,
       icon = $5,
       title = $6,
       subtitle = $7,
       sort_order = $8,
       active = $9
     WHERE id = $1
     RETURNING id`,
    [
      categoryId,
      payload.slug,
      payload.navLabel,
      payload.adminLabel,
      payload.icon,
      payload.title,
      payload.subtitle,
      payload.sortOrder,
      payload.active,
    ]
  );
  if (!result.rowCount) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe.');
  return { ...payload, id: categoryId };
}

export async function deactivateCatalogCategory(categoryId) {
  return withTransaction(async (client) => {
    const category = await client.query(
      `SELECT id FROM catalog_categories WHERE id = $1 FOR UPDATE`,
      [categoryId]
    );
    if (!category.rowCount) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe.');
    const products = await client.query(
      `SELECT COUNT(*)::int AS count FROM catalog_products
       WHERE category_id = $1 AND active = TRUE`,
      [categoryId]
    );
    if (products.rows[0].count > 0) {
      throw new AppError(
        409,
        'CATEGORY_NOT_EMPTY',
        'No puedes desactivar una categoría que todavía tiene productos activos.'
      );
    }
    await client.query(`UPDATE catalog_categories SET active = FALSE WHERE id = $1`, [categoryId]);
    return { id: categoryId, active: false };
  });
}
