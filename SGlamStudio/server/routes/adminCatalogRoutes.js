import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireSession } from '../middlewares/adminAuth.js';
import {
  createCatalogCategory,
  createCatalogProduct,
  deactivateCatalogCategory,
  listAdminCategories,
  listAdminProducts,
  resetCatalogPrices,
  setCatalogProductActive,
  updateCatalogCategory,
  updateCatalogPrices,
  updateCatalogProduct,
} from '../services/catalogService.js';

const router = Router();
const uuid = z.string().uuid();
const price = z.coerce.number().int().min(0).max(100000000);
const httpsUrl = z.string().url().refine((value) => value.startsWith('https://'), {
  message: 'La imagen debe usar HTTPS.',
});

const priceUpdateSchema = z.object({
  updates: z.array(z.object({ productId: uuid, priceCop: price })).min(1).max(500),
}).superRefine(({ updates }, context) => {
  if (new Set(updates.map((update) => update.productId)).size !== updates.length) {
    context.addIssue({ code: 'custom', message: 'Cada producto debe aparecer una sola vez.' });
  }
});
const resetSchema = z.object({
  productIds: z.array(uuid).min(1).max(500),
}).superRefine(({ productIds }, context) => {
  if (new Set(productIds).size !== productIds.length) {
    context.addIssue({ code: 'custom', message: 'Cada producto debe aparecer una sola vez.' });
  }
});
const productSchema = z.object({
  name: z.string().trim().min(1).max(220),
  displayName: z.string().trim().min(1).max(220).optional(),
  brand: z.string().trim().min(1).max(160),
  categoryId: uuid,
  priceCop: price,
  imageUrl: httpsUrl,
  secondImageUrl: z.union([httpsUrl, z.literal('')]).optional().default(''),
});
const categoryBaseSchema = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  navLabel: z.string().trim().min(1).max(120),
  adminLabel: z.string().trim().min(1).max(120),
  icon: z.string().trim().max(40).default(''),
  title: z.string().trim().min(1).max(180),
  subtitle: z.string().trim().max(220).default(''),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});
const createCategorySchema = categoryBaseSchema;
const updateCategorySchema = categoryBaseSchema.extend({ active: z.boolean() });

router.use(requireSession, requireAdmin);

router.get('/products', async (req, res, next) => {
  try {
    return res.json({ products: await listAdminProducts() });
  } catch (error) {
    return next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    return res.json({ categories: await listAdminCategories() });
  } catch (error) {
    return next(error);
  }
});

router.patch('/prices', async (req, res, next) => {
  try {
    const { updates } = priceUpdateSchema.parse(req.body);
    const products = await updateCatalogPrices(updates, req.adminSession.device_id);
    return res.json({ products });
  } catch (error) {
    return next(error);
  }
});

router.post('/prices/reset', async (req, res, next) => {
  try {
    const { productIds } = resetSchema.parse(req.body);
    const products = await resetCatalogPrices(productIds, req.adminSession.device_id);
    return res.json({ products });
  } catch (error) {
    return next(error);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const payload = productSchema.parse(req.body);
    const product = await createCatalogProduct(payload, req.adminSession.device_id);
    return res.status(201).json({ product });
  } catch (error) {
    return next(error);
  }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const productId = uuid.parse(req.params.id);
    const payload = productSchema.parse(req.body);
    const product = await updateCatalogProduct(productId, payload, req.adminSession.device_id);
    return res.json({ product });
  } catch (error) {
    return next(error);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const productId = uuid.parse(req.params.id);
    await setCatalogProductActive(productId, false);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post('/products/:id/restore', async (req, res, next) => {
  try {
    const productId = uuid.parse(req.params.id);
    return res.json({ product: await setCatalogProductActive(productId, true) });
  } catch (error) {
    return next(error);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const payload = createCategorySchema.parse(req.body);
    return res.status(201).json({ category: await createCatalogCategory(payload) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/categories/:id', async (req, res, next) => {
  try {
    const categoryId = uuid.parse(req.params.id);
    const payload = updateCategorySchema.parse(req.body);
    return res.json({ category: await updateCatalogCategory(categoryId, payload) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const categoryId = uuid.parse(req.params.id);
    await deactivateCatalogCategory(categoryId);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export {
  createCategorySchema,
  priceUpdateSchema,
  productSchema,
  resetSchema,
  updateCategorySchema,
};
export default router;
