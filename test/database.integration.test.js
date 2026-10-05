import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import pg from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;
const legacySchema = `
  CREATE TABLE admin_devices (
    id UUID PRIMARY KEY, name VARCHAR(80) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ
  );
  CREATE TABLE activation_tokens (
    id UUID PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE, label VARCHAR(80) NOT NULL,
    created_by_device_id UUID REFERENCES admin_devices(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ
  );
  CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY, device_id UUID NOT NULL REFERENCES admin_devices(id), token_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ
  );
  CREATE TABLE catalog_categories (
    id UUID PRIMARY KEY, slug VARCHAR(80) NOT NULL UNIQUE, nav_label VARCHAR(120) NOT NULL,
    admin_label VARCHAR(120) NOT NULL, icon VARCHAR(40) NOT NULL DEFAULT '', title VARCHAR(180) NOT NULL,
    subtitle VARCHAR(220) NOT NULL DEFAULT ''
  );
  CREATE TABLE catalog_brands (
    id UUID PRIMARY KEY, name VARCHAR(160) NOT NULL UNIQUE, slug VARCHAR(180) NOT NULL UNIQUE
  );
  CREATE TABLE catalog_brand_aliases (
    id UUID PRIMARY KEY, brand_id UUID NOT NULL REFERENCES catalog_brands(id), alias VARCHAR(160) NOT NULL,
    alias_normalized VARCHAR(160) NOT NULL UNIQUE, UNIQUE(brand_id, alias)
  );
  CREATE TABLE catalog_products (
    id UUID PRIMARY KEY, category_id UUID NOT NULL REFERENCES catalog_categories(id),
    brand_id UUID NOT NULL REFERENCES catalog_brands(id), name VARCHAR(220) NOT NULL,
    display_name VARCHAR(220) NOT NULL, UNIQUE(category_id, brand_id, name)
  );
  CREATE TABLE catalog_product_images (
    id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES catalog_products(id), image_url TEXT NOT NULL,
    alt_text VARCHAR(260) NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE, UNIQUE(product_id, position)
  );
  CREATE TABLE catalog_product_prices (
    id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES catalog_products(id), price_cop INTEGER NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(), valid_to TIMESTAMPTZ,
    changed_by_device_id UUID REFERENCES admin_devices(id)
  );
`;

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: databaseUrl,
        DATABASE_SSL: 'false',
        CSRF_SECRET: 'integration-test-secret-at-least-32-characters',
      },
      stdio: 'pipe',
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve(output) : reject(new Error(output)));
  });
}

test('migración, semilla, sesión revocable, CSRF y CRUD funcionan en PostgreSQL', {
  skip: !databaseUrl ? 'Define TEST_DATABASE_URL con una base exclusiva de pruebas.' : false,
  timeout: 60000,
}, async () => {
  const { Pool } = pg;
  const verificationPool = new Pool({ connectionString: databaseUrl });
  const schema = await fs.readFile(new URL('../server/db/schema.sql', import.meta.url), 'utf8');
  await verificationPool.query(legacySchema);
  await verificationPool.query(`
    INSERT INTO catalog_brands (id, name, slug) VALUES
      ('10000000-0000-4000-8000-000000000001', 'MyK', 'myk'),
      ('10000000-0000-4000-8000-000000000002', 'Ani-K', 'ani-k'),
      ('10000000-0000-4000-8000-000000000003', 'Enchanté', 'enchante'),
      ('10000000-0000-4000-8000-000000000004', 'HuxiaBeauty', 'huxiabeauty')
  `);
  await verificationPool.query(`
    INSERT INTO catalog_brand_aliases (id, brand_id, alias, alias_normalized) VALUES
      ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Enchante', 'enchante'),
      ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'Enchanté', 'enchanté')
  `);
  await verificationPool.query(schema);
  await runNode('server/scripts/seedCatalog.js');

  const counts = await verificationPool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM catalog_categories WHERE active) categories,
      (SELECT COUNT(*)::int FROM catalog_brands b WHERE EXISTS (
        SELECT 1 FROM catalog_products p WHERE p.brand_id = b.id AND p.active
      )) brands,
      (SELECT COUNT(*)::int FROM catalog_products WHERE active) products,
      (SELECT COUNT(*)::int FROM catalog_product_images WHERE is_primary) images,
      (SELECT COUNT(*)::int FROM catalog_price_history WHERE valid_to IS NULL) prices,
      (SELECT COUNT(*)::int FROM catalog_products p
        LEFT JOIN catalog_categories c ON c.id = p.category_id
        LEFT JOIN catalog_brands b ON b.id = p.brand_id
        WHERE c.id IS NULL OR b.id IS NULL) orphans
  `);
  assert.deepEqual(counts.rows[0], { categories: 5, brands: 72, products: 197, images: 197, prices: 197, orphans: 0 });
  const canonicalBrands = await verificationPool.query(
    `SELECT name FROM catalog_brands WHERE slug = ANY($1::text[]) ORDER BY slug`,
    [['myk', 'ani-k', 'enchante', 'huxiabeauty']]
  );
  assert.deepEqual(canonicalBrands.rows.map((row) => row.name).sort(), ['ANI-K', 'Enchanté', 'HuxiaBeauty', 'MYK'].sort());
  await verificationPool.end();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_SSL = 'false';
  process.env.CSRF_SECRET = 'integration-test-secret-at-least-32-characters';
  const auth = await import('../server/services/adminAuthService.js');
  const catalog = await import('../server/services/catalogService.js');
  const { pool } = await import('../server/db.js');
  const invite = await auth.createActivationInvite({ label: 'Prueba integrada' });
  const activated = await auth.activateDevice({ token: invite.token, deviceName: 'Prueba', userAgent: 'node-test' });
  const session = await auth.findSession(activated.sessionToken);
  assert.equal(session.role, 'ADMIN');

  const categories = await catalog.listAdminCategories();
  const created = await catalog.createCatalogProduct({
    name: `Producto prueba ${Date.now()}`,
    displayName: 'Producto de prueba',
    brand: 'Marca de prueba',
    categoryId: categories[0].id,
    priceCop: 12345,
    imageUrl: 'https://example.com/producto-prueba.png',
  }, session.device_id);
  await catalog.updateCatalogPrices([{ productId: created.id, priceCop: 15000 }], session.device_id);
  await catalog.setCatalogProductActive(created.id, false);
  await catalog.setCatalogProductActive(created.id, true);
  const updated = (await catalog.listAdminProducts()).find((product) => product.id === created.id);
  assert.equal(updated.price, 15000);
  assert.equal(updated.active, true);

  await auth.revokeDevice(session.device_id);
  assert.equal(await auth.findSession(activated.sessionToken), null);
  await pool.end();
});
