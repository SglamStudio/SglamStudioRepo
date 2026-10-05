import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../server/middlewares/adminAuth.js';
import { activationSchema } from '../server/routes/authRoutes.js';
import {
  createCategorySchema,
  priceUpdateSchema,
  productSchema,
} from '../server/routes/adminCatalogRoutes.js';
import {
  clearCookieOptions,
  cookieOptions,
  createOpaqueToken,
  csrfTokenForSession,
  hashToken,
  safeEqual,
} from '../server/security/tokens.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('los tokens opacos no se almacenan como texto plano', () => {
  const token = createOpaqueToken();
  const digest = hashToken(token);
  assert.notEqual(token, digest);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(safeEqual(digest, hashToken(token)), true);
  assert.equal(safeEqual(digest, hashToken(`${token}x`)), false);
  assert.equal(cookieOptions().httpOnly, true);
  assert.equal(cookieOptions().sameSite, 'strict');
  assert.equal('maxAge' in clearCookieOptions(), false);
});

test('requireAdmin exige rol ADMIN y CSRF en mutaciones', () => {
  const sessionToken = createOpaqueToken();
  const forbidden = responseRecorder();
  requireAdmin({ adminSession: { role: 'CUSTOMER' }, method: 'GET', get: () => '' }, forbidden, () => {});
  assert.equal(forbidden.statusCode, 403);

  const missingCsrf = responseRecorder();
  requireAdmin({
    adminSession: { role: 'ADMIN' },
    rawAdminSessionToken: sessionToken,
    method: 'PATCH',
    get: () => '',
  }, missingCsrf, () => {});
  assert.equal(missingCsrf.statusCode, 403);

  let continued = false;
  requireAdmin({
    adminSession: { role: 'ADMIN' },
    rawAdminSessionToken: sessionToken,
    method: 'PATCH',
    get: (name) => name === 'X-CSRF-Token' ? csrfTokenForSession(sessionToken) : '',
  }, responseRecorder(), () => { continued = true; });
  assert.equal(continued, true);
});

test('los esquemas rechazan UUID, URL y precios inválidos', () => {
  assert.equal(activationSchema.safeParse({ token: 'corto', deviceName: '' }).success, false);
  assert.equal(productSchema.safeParse({
    name: 'Producto',
    displayName: 'Producto',
    brand: 'Marca',
    categoryId: 'no-es-uuid',
    priceCop: -1,
    imageUrl: 'http://example.com/image.png',
  }).success, false);
  assert.equal(priceUpdateSchema.safeParse({ updates: [
    { productId: '5bd80860-6a03-4e3f-a641-286407057017', priceCop: 1000 },
    { productId: '5bd80860-6a03-4e3f-a641-286407057017', priceCop: 2000 },
  ] }).success, false);
  assert.equal(createCategorySchema.safeParse({
    slug: 'Nombre Inválido', navLabel: 'X', adminLabel: 'X', icon: '', title: 'X', subtitle: '', sortOrder: 0,
  }).success, false);
});
