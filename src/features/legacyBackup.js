export const LEGACY_CATALOG_KEYS = [
  'glam_custom_products',
  'glam_custom_categories',
  'glam_deleted_products',
  'glam_price_overrides',
];

function readValue(key) {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { invalidJson: true, raw };
  }
}

export function createLegacyBackup() {
  const data = Object.fromEntries(LEGACY_CATALOG_KEYS.map((key) => [key, readValue(key)]));
  return {
    format: 'glam-studio-legacy-localstorage-v1',
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    data,
  };
}

export function hasLegacyCatalogData() {
  return LEGACY_CATALOG_KEYS.some((key) => window.localStorage.getItem(key) !== null);
}

export function downloadLegacyBackup() {
  const blob = new Blob([JSON.stringify(createLegacyBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `glam-studio-respaldo-local-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
