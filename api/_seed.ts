import crypto from "crypto";
import { get, run } from "./_db";

const DEFAULT_ADMIN_EMAIL = "hadiaghazanfar354@gmail.com";

export async function seedAdmin(): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const existing = await get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existing) return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require("bcryptjs");

  let plainPassword = process.env.ADMIN_PASSWORD;
  const generated = !plainPassword;
  if (!plainPassword) {
    plainPassword = crypto.randomBytes(12).toString("hex");
  }
  const password_hash = bcrypt.hashSync(plainPassword, 10);
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  await run(
    "INSERT INTO users (id, name, phone, shop_name, shop_address, pin_hash, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [id, "Admin", null, null, null, null, adminEmail, password_hash, "admin", created_at]
  );

  if (generated) {
    console.warn("======================================================================");
    console.warn("DAYBILL ADMIN SEEDED — save this password NOW. It is shown ONLY ONCE:");
    console.warn(`  email:    ${adminEmail}`);
    console.warn(`  password: ${plainPassword}`);
    console.warn("Set ADMIN_PASSWORD in your env to avoid generating a new one on boot.");
    console.warn("======================================================================");
  } else {
    console.log(`Daybill admin seeded: ${adminEmail}`);
  }
}
