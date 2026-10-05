BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(80) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_devices (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
  user_agent TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_devices ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'ADMIN';
ALTER TABLE admin_devices ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE admin_devices ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE admin_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE admin_devices ALTER COLUMN name TYPE VARCHAR(120);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_devices_role_check') THEN
    ALTER TABLE admin_devices
      ADD CONSTRAINT admin_devices_role_check CHECK (role IN ('ADMIN'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS activation_tokens (
  id UUID PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  label VARCHAR(120),
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_device_id UUID REFERENCES admin_devices(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  used_by_device_id UUID REFERENCES admin_devices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE activation_tokens ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'ADMIN';
ALTER TABLE activation_tokens ADD COLUMN IF NOT EXISTS created_by_device_id UUID REFERENCES admin_devices(id) ON DELETE SET NULL;
ALTER TABLE activation_tokens ADD COLUMN IF NOT EXISTS used_by_device_id UUID REFERENCES admin_devices(id);
ALTER TABLE activation_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE activation_tokens ALTER COLUMN label DROP NOT NULL;
ALTER TABLE activation_tokens ALTER COLUMN label TYPE VARCHAR(120);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES admin_devices(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_secret CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE admin_sessions
  ADD COLUMN IF NOT EXISTS csrf_secret CHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000';
ALTER TABLE admin_sessions ALTER COLUMN csrf_secret DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_admin_sessions_device ON admin_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_expires ON activation_tokens(expires_at);

CREATE TABLE IF NOT EXISTS catalog_categories (
  id UUID PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  nav_label VARCHAR(120) NOT NULL,
  admin_label VARCHAR(120) NOT NULL,
  icon VARCHAR(40) NOT NULL DEFAULT '',
  title VARCHAR(180) NOT NULL,
  subtitle VARCHAR(220) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS catalog_brands (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  slug VARCHAR(180) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE catalog_brands ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE catalog_brands ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE catalog_brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS catalog_brand_aliases (
  id UUID PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES catalog_brands(id) ON DELETE CASCADE,
  alias VARCHAR(160) NOT NULL,
  alias_normalized VARCHAR(160) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE catalog_brand_aliases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_catalog_brand_aliases_brand ON catalog_brand_aliases(brand_id);

CREATE TABLE IF NOT EXISTS catalog_products (
  id UUID PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES catalog_categories(id),
  brand_id UUID NOT NULL REFERENCES catalog_brands(id),
  name VARCHAR(220) NOT NULL,
  display_name VARCHAR(220) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, brand_id, name)
);

ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_catalog_products_category ON catalog_products(category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_brand ON catalog_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_active ON catalog_products(active);

CREATE TABLE IF NOT EXISTS catalog_product_images (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (url ~ '^https://'),
  alt_text VARCHAR(260) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalog_product_images' AND column_name = 'image_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalog_product_images' AND column_name = 'url'
  ) THEN
    ALTER TABLE catalog_product_images RENAME COLUMN image_url TO url;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalog_product_images' AND column_name = 'position'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalog_product_images' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE catalog_product_images RENAME COLUMN position TO sort_order;
  END IF;
END $$;

ALTER TABLE catalog_product_images ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE catalog_product_images ADD COLUMN IF NOT EXISTS alt_text VARCHAR(260) NOT NULL DEFAULT '';
ALTER TABLE catalog_product_images ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE catalog_product_images ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE catalog_product_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE catalog_product_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE catalog_product_images ALTER COLUMN url SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_product_images_https_check') THEN
    ALTER TABLE catalog_product_images
      ADD CONSTRAINT catalog_product_images_https_check CHECK (url ~ '^https://') NOT VALID;
    ALTER TABLE catalog_product_images VALIDATE CONSTRAINT catalog_product_images_https_check;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_catalog_product_images_product ON catalog_product_images(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_product_primary_image
  ON catalog_product_images(product_id) WHERE is_primary;

DO $$
BEGIN
  IF to_regclass('public.catalog_product_prices') IS NOT NULL
     AND to_regclass('public.catalog_price_history') IS NULL THEN
    ALTER TABLE catalog_product_prices RENAME TO catalog_price_history;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS catalog_price_history (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  price_cop INTEGER NOT NULL CHECK (price_cop >= 0),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  changed_by_device_id UUID REFERENCES admin_devices(id) ON DELETE SET NULL,
  reason VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

ALTER TABLE catalog_price_history ADD COLUMN IF NOT EXISTS reason VARCHAR(180);
ALTER TABLE catalog_price_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE catalog_price_history ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE catalog_price_history ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ;
ALTER TABLE catalog_price_history ADD COLUMN IF NOT EXISTS changed_by_device_id UUID REFERENCES admin_devices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_price_history_product ON catalog_price_history(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_product_current_price
  ON catalog_price_history(product_id) WHERE valid_to IS NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_devices_updated_at ON admin_devices;
CREATE TRIGGER trg_admin_devices_updated_at
BEFORE UPDATE ON admin_devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_catalog_categories_updated_at ON catalog_categories;
CREATE TRIGGER trg_catalog_categories_updated_at
BEFORE UPDATE ON catalog_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_catalog_brands_updated_at ON catalog_brands;
CREATE TRIGGER trg_catalog_brands_updated_at
BEFORE UPDATE ON catalog_brands FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_catalog_products_updated_at ON catalog_products;
CREATE TRIGGER trg_catalog_products_updated_at
BEFORE UPDATE ON catalog_products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_catalog_product_images_updated_at ON catalog_product_images;
CREATE TRIGGER trg_catalog_product_images_updated_at
BEFORE UPDATE ON catalog_product_images FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP VIEW IF EXISTS catalog_product_listing;
CREATE VIEW catalog_product_listing AS
SELECT
  p.id,
  p.name,
  p.display_name,
  p.active,
  p.created_at,
  p.updated_at,
  c.id AS category_id,
  c.slug AS category_slug,
  c.nav_label AS category_nav_label,
  c.sort_order AS category_sort_order,
  b.id AS brand_id,
  b.name AS brand_name,
  img.url AS image_url,
  img.alt_text,
  price.price_cop,
  price.valid_from AS price_valid_from
FROM catalog_products p
JOIN catalog_categories c ON c.id = p.category_id
JOIN catalog_brands b ON b.id = p.brand_id
LEFT JOIN catalog_product_images img ON img.product_id = p.id AND img.is_primary
LEFT JOIN catalog_price_history price ON price.product_id = p.id AND price.valid_to IS NULL
WHERE p.active = TRUE AND c.active = TRUE;

COMMENT ON VIEW catalog_product_listing IS
  'Listado público: solo categorías/productos activos, imagen principal y precio vigente.';

ALTER TABLE admin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_brand_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_price_history ENABLE ROW LEVEL SECURITY;

INSERT INTO schema_migrations(version)
VALUES ('2026-08-30_catalog_and_device_sessions_v1')
ON CONFLICT (version) DO NOTHING;

COMMIT;
