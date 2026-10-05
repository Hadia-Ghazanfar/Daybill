import { run } from "./_db";

const TABLES = `
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  shop_name TEXT,
  shop_address TEXT,
  pin_hash TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS customers(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  phone TEXT,
  address TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS suppliers(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  phone TEXT,
  address TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS products(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  cost_price REAL,
  selling_price REAL,
  stock INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS invoices(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_id TEXT,
  invoice_no TEXT,
  date TEXT,
  discount REAL DEFAULT 0,
  payment_method TEXT,
  due_status TEXT DEFAULT 'pending',
  accent_color TEXT,
  notes TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS invoice_items(
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  product_id TEXT,
  qty INTEGER,
  price REAL
);
CREATE TABLE IF NOT EXISTS purchases(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  supplier_id TEXT,
  type TEXT,
  delivered INTEGER DEFAULT 0,
  date TEXT,
  notes TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS purchase_items(
  id TEXT PRIMARY KEY,
  purchase_id TEXT,
  product_id TEXT,
  qty INTEGER,
  cost REAL
);
CREATE TABLE IF NOT EXISTS feedback(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  category TEXT,
  message TEXT,
  created_at TEXT
);
`;

export async function migrate(): Promise<void> {
  for (const stmt of TABLES.split(";")) {
    const s = stmt.trim();
    if (s) await run(s);
  }
}
