import test from 'node:test';
import assert from 'node:assert/strict';
import { categories } from '../src/data/categories.js';
import { products } from '../src/data/products.js';
import {
  assertValidCatalogSource,
  canonicalBrandName,
  normalizeBrandAlias,
} from '../shared/catalogNormalization.js';

test('el catálogo fuente contiene exactamente los registros esperados y relaciones válidas', () => {
  const report = assertValidCatalogSource(categories, products);
  assert.equal(report.categoryCount, 5);
  assert.equal(report.brandCount, 72);
  assert.equal(report.productCount, 197);
  assert.equal(report.primaryImageCount, 197);
  assert.equal(report.currentPriceCount, 197);
  assert.deepEqual(report.invalidImages, []);
  assert.deepEqual(report.invalidPrices, []);
  assert.deepEqual(report.orphanProducts, []);
  assert.deepEqual(report.duplicateProducts, []);
});

test('los alias de marca solicitados convergen sin mezclar S.F.R y SFR', () => {
  assert.equal(canonicalBrandName('Huxiabeauty'), 'HuxiaBeauty');
  assert.equal(canonicalBrandName('HuxiaBeauty'), 'HuxiaBeauty');
  assert.equal(canonicalBrandName('MyK'), 'MYK');
  assert.equal(canonicalBrandName('ANI-K'), 'ANI-K');
  assert.equal(canonicalBrandName('Enchante'), 'Enchanté');
  assert.equal(canonicalBrandName('Enchanté'), 'Enchanté');
  assert.notEqual(normalizeBrandAlias('S.F.R'), normalizeBrandAlias('SFR'));
});
