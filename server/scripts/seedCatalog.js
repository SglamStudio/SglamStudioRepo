import { randomUUID } from 'node:crypto';
import { categories } from '../../src/data/categories.js';
import { products } from '../../src/data/products.js';
import {
  assertValidCatalogSource,
  canonicalBrandName,
  normalizeBrandAlias,
  slugifyCatalogValue,
} from '../../shared/catalogNormalization.js';
import { pool, withTransaction } from '../db.js';

function plainText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const forcePrices = process.argv.includes('--force-prices');
const sourceReport = assertValidCatalogSource(categories, products);

try {
  const changes = await withTransaction(async (client) => {
    const categoryIds = new Map();

    for (const [sortOrder, category] of categories.entries()) {
      const result = await client.query(
        `INSERT INTO catalog_categories
          (id, slug, nav_label, admin_label, icon, title, subtitle, sort_order, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         ON CONFLICT (slug) DO UPDATE SET
           nav_label = EXCLUDED.nav_label,
           admin_label = EXCLUDED.admin_label,
           icon = EXCLUDED.icon,
           title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle,
           sort_order = EXCLUDED.sort_order,
           active = TRUE
         RETURNING id`,
        [
          randomUUID(),
          category.id,
          plainText(category.navLabel),
          plainText(category.adminLabel),
          plainText(category.icon),
          plainText(category.title),
          plainText(category.subtitle),
          sortOrder,
        ]
      );
      categoryIds.set(category.id, result.rows[0].id);
    }

    const aliasesByCanonicalBrand = new Map();
    for (const product of products) {
      const canonical = canonicalBrandName(product.brand);
      if (!aliasesByCanonicalBrand.has(canonical)) aliasesByCanonicalBrand.set(canonical, new Set());
      aliasesByCanonicalBrand.get(canonical).add(product.brand);
    }

    const brandIds = new Map();
    for (const [canonical, rawAliases] of aliasesByCanonicalBrand) {
      const canonicalSlug = slugifyCatalogValue(canonical);
      const existingBrands = await client.query(
        `SELECT id, name, slug FROM catalog_brands
         WHERE name = $1 OR slug = $2
         ORDER BY CASE WHEN name = $1 THEN 0 ELSE 1 END
         FOR UPDATE`,
        [canonical, canonicalSlug]
      );
      if (existingBrands.rowCount > 1) {
        throw new Error(
          `Hay más de una marca para la forma canónica “${canonical}” (${canonicalSlug}). `
          + 'Revisa las filas duplicadas antes de continuar.'
        );
      }

      let brandId;
      if (existingBrands.rowCount === 1) {
        brandId = existingBrands.rows[0].id;
        await client.query(
          `UPDATE catalog_brands
           SET name = $2, slug = $3, active = TRUE
           WHERE id = $1`,
          [brandId, canonical, canonicalSlug]
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO catalog_brands (id, name, slug, active)
           VALUES ($1, $2, $3, TRUE)
           RETURNING id`,
          [randomUUID(), canonical, canonicalSlug]
        );
        brandId = inserted.rows[0].id;
      }
      brandIds.set(canonical, brandId);

      const aliasGroups = new Map();
      for (const alias of new Set([...rawAliases, canonical])) {
        const key = normalizeBrandAlias(alias);
        if (!aliasGroups.has(key)) aliasGroups.set(key, []);
        aliasGroups.get(key).push(alias);
      }

      for (const [aliasNormalized, variants] of aliasGroups) {
        const representative = variants.includes(canonical) ? canonical : variants[0];
        const candidates = await client.query(
          `SELECT id, brand_id, alias FROM catalog_brand_aliases
           WHERE alias_normalized = $1
              OR (brand_id = $2 AND alias = ANY($3::text[]))
           FOR UPDATE`,
          [aliasNormalized, brandId, variants]
        );

        if (candidates.rowCount) {
          const keeper = candidates.rows.find((row) => row.brand_id === brandId && row.alias === representative)
            || candidates.rows[0];
          const duplicateIds = candidates.rows.filter((row) => row.id !== keeper.id).map((row) => row.id);
          if (duplicateIds.length) {
            await client.query(
              `DELETE FROM catalog_brand_aliases WHERE id = ANY($1::uuid[])`,
              [duplicateIds]
            );
          }
          await client.query(
            `UPDATE catalog_brand_aliases
             SET brand_id = $2, alias = $3, alias_normalized = $4
             WHERE id = $1`,
            [keeper.id, brandId, representative, aliasNormalized]
          );
        } else {
          await client.query(
            `INSERT INTO catalog_brand_aliases (id, brand_id, alias, alias_normalized)
             VALUES ($1, $2, $3, $4)`,
            [randomUUID(), brandId, representative, aliasNormalized]
          );
        }
      }
    }

    const report = {
      categories: categoryIds.size,
      brands: brandIds.size,
      productsInserted: 0,
      productsUpdated: 0,
      pricesInserted: 0,
      pricesChanged: 0,
      manualPricesPreserved: 0,
      forcePrices,
    };

    for (const product of products) {
      const brandId = brandIds.get(canonicalBrandName(product.brand));
      const categoryId = categoryIds.get(product.category);
      if (!brandId || !categoryId) throw new Error(`Producto sin relación válida: ${product.name}`);

      const existing = await client.query(
        `SELECT id FROM catalog_products
         WHERE brand_id = $1 AND category_id = $2 AND name = $3`,
        [brandId, categoryId, product.name]
      );
      const productResult = await client.query(
        `INSERT INTO catalog_products
          (id, brand_id, category_id, name, display_name, active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (brand_id, category_id, name) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           active = TRUE
         RETURNING id`,
        [randomUUID(), brandId, categoryId, product.name, product.displayName || product.name]
      );
      const productId = productResult.rows[0].id;
      if (existing.rowCount) report.productsUpdated += 1;
      else report.productsInserted += 1;

      await client.query(
        `INSERT INTO catalog_product_images
          (id, product_id, url, alt_text, sort_order, is_primary)
         VALUES ($1, $2, $3, $4, 0, TRUE)
         ON CONFLICT (product_id) WHERE is_primary DO UPDATE SET
           url = EXCLUDED.url,
           alt_text = EXCLUDED.alt_text,
           sort_order = 0`,
        [
          randomUUID(),
          productId,
          product.image,
          `${product.displayName || product.name} ${product.displayBrand || product.brand}`,
        ]
      );

      const currentPrice = await client.query(
        `SELECT id, price_cop FROM catalog_price_history
         WHERE product_id = $1 AND valid_to IS NULL
         FOR UPDATE`,
        [productId]
      );

      if (!currentPrice.rowCount) {
        await client.query(
          `INSERT INTO catalog_price_history (id, product_id, price_cop, reason)
           VALUES ($1, $2, $3, 'Carga inicial del catálogo')`,
          [randomUUID(), productId, product.price]
        );
        report.pricesInserted += 1;
      } else if (currentPrice.rows[0].price_cop !== product.price && forcePrices) {
        await client.query(
          `UPDATE catalog_price_history SET valid_to = NOW() WHERE id = $1`,
          [currentPrice.rows[0].id]
        );
        await client.query(
          `INSERT INTO catalog_price_history (id, product_id, price_cop, reason)
           VALUES ($1, $2, $3, 'Sincronización forzada con el catálogo fuente')`,
          [randomUUID(), productId, product.price]
        );
        report.pricesChanged += 1;
      } else if (currentPrice.rows[0].price_cop !== product.price) {
        report.manualPricesPreserved += 1;
      }
    }

    return report;
  });

  const verification = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM catalog_categories WHERE active) AS categories,
      (SELECT COUNT(*)::int FROM catalog_brands b WHERE EXISTS (
        SELECT 1 FROM catalog_products p WHERE p.brand_id = b.id AND p.active
      )) AS brands,
      (SELECT COUNT(*)::int FROM catalog_products WHERE active) AS products,
      (SELECT COUNT(*)::int FROM catalog_product_images WHERE is_primary) AS primary_images,
      (SELECT COUNT(*)::int FROM catalog_price_history WHERE valid_to IS NULL) AS current_prices,
      (SELECT COUNT(*)::int FROM catalog_products p
        LEFT JOIN catalog_categories c ON c.id = p.category_id
        LEFT JOIN catalog_brands b ON b.id = p.brand_id
        WHERE c.id IS NULL OR b.id IS NULL) AS orphan_products,
      (SELECT COUNT(*)::int FROM catalog_price_history WHERE price_cop < 0) AS negative_prices,
      (SELECT COUNT(*)::int FROM (
        SELECT category_id, brand_id, name FROM catalog_products
        GROUP BY category_id, brand_id, name HAVING COUNT(*) > 1
      ) d) AS duplicate_products,
      (SELECT COUNT(*)::int FROM (
        SELECT product_id FROM catalog_price_history WHERE valid_to IS NULL
        GROUP BY product_id HAVING COUNT(*) > 1
      ) d) AS multiple_current_prices
  `);

  console.log('Catálogo fuente validado:');
  console.table({
    categories: sourceReport.categoryCount,
    brands: sourceReport.brandCount,
    products: sourceReport.productCount,
    primaryImages: sourceReport.primaryImageCount,
    currentPrices: sourceReport.currentPriceCount,
  });
  console.log('Resultado de la carga:');
  console.table(changes);
  console.log('Verificación en PostgreSQL:');
  console.table(verification.rows[0]);
} finally {
  await pool.end();
}
