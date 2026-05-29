-- Supabase schema for Next.js Commerce

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  available_for_sale BOOLEAN DEFAULT TRUE,
  title TEXT,
  description TEXT,
  description_html TEXT,
  options JSONB,
  price_range JSONB,
  variants JSONB,
  featured_image JSONB,
  images JSONB,
  seo JSONB,
  tags TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now(),
  collection_handles TEXT[],
  recommendation_ids TEXT[],
  sales_rank INT
);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  handle TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  seo JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  hidden BOOLEAN DEFAULT FALSE
);

-- Pages
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  title TEXT,
  handle TEXT UNIQUE,
  body TEXT,
  body_summary TEXT,
  seo JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Menus (flat list of menu items; grouped by handle)
CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  handle TEXT,
  title TEXT,
  path TEXT,
  position INT DEFAULT 0
);

-- Orders (manual UPI flow)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  shipping_name TEXT,
  shipping_line1 TEXT,
  shipping_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT,
  shipping_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  customer_email TEXT,
  guest_email TEXT,
  shipping_name TEXT,
  shipping_line1 TEXT,
  shipping_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT,
  shipping_phone TEXT,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'upi',
  payment_status TEXT DEFAULT 'pending',
  currency_code TEXT,
  total_amount NUMERIC(12, 2),
  cart_snapshot JSONB,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: simple ACL table for tracking service keys (not required)
CREATE TABLE IF NOT EXISTS app_keys (
  id SERIAL PRIMARY KEY,
  name TEXT,
  key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
