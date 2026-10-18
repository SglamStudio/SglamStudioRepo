import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { pool } from '../server/db.js';

test('la frontera HTTP oculta admin, valida activación y publica CSP', async () => {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const session = await fetch(`${base}/api/auth/session`);
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), { authenticated: false, role: 'CUSTOMER' });
    assert.match(session.headers.get('content-security-policy'), /default-src 'self'/);

    const robots = await fetch(`${base}/robots.txt`);
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Sitemap: https:\/\/sglam-studio-repo\.vercel\.app\/sitemap\.xml/);

    const sitemap = await fetch(`${base}/sitemap.xml`);
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type'), /application\/xml/);
    assert.match(await sitemap.text(), /<loc>https:\/\/sglam-studio-repo\.vercel\.app\/<\/loc>/);

    const hiddenAdmin = await fetch(`${base}/api/admin/catalog/products`);
    assert.equal(hiddenAdmin.status, 401);

    const invalidActivation = await fetch(`${base}/api/auth/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'corto', deviceName: '' }),
    });
    assert.equal(invalidActivation.status, 400);
    assert.equal((await invalidActivation.json()).error, 'INVALID_REQUEST');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
