import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const router = Router();
const uuid = z.string().uuid();
const copFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    brandId: row.brand_id,
    brand: row.brand_name,
    displayBrand: row.brand_name,
    price: row.price_cop,
    priceDisplay: copFormatter.format(row.price_cop),
    image: row.image_url || '',
    imageAlt: row.alt_text || '',
    categoryId: row.category_id,
    category: row.category_slug,
  };
}

router.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, nav_label, admin_label, icon, title, subtitle, sort_order
       FROM catalog_categories
       WHERE active = TRUE
       ORDER BY sort_order, slug`
    );
    return res.json({
      categories: result.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        navLabel: row.nav_label,
        adminLabel: row.admin_label,
        icon: row.icon,
        title: row.title,
        subtitle: row.subtitle,
        sortOrder: row.sort_order,
        gridId: row.slug === 'polvo' ? 'polvoRuborGrid' : `${row.slug}Grid`,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/products', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM catalog_product_listing
       ORDER BY category_sort_order, price_cop, name`
    );
    return res.json({ products: result.rows.map(mapProduct) });
  } catch (error) {
    return next(error);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const productId = uuid.parse(req.params.id);
    const result = await pool.query(
      `SELECT * FROM catalog_product_listing WHERE id = $1`,
      [productId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
    return res.json({ product: mapProduct(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

export default router;
