// POST /api/auth/register
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");
import { query, run } from "../_db";
import { signJWT } from "../_auth";
import { userShape, toDigits, isValidDisplayPhone, newId, nowIso, wrap } from "../_util";
import { HttpError as HE } from "../_auth";

export default wrap(async (req: any, res: any) => {
  const { name, phone, shopName, shopAddress, pin } = req.body || {};
  if (!name || !phone || !shopName || !shopAddress || !pin) {
    throw new HE(400, "name, phone, shopName, shopAddress and pin are required");
  }
  if (!isValidDisplayPhone(phone)) throw new HE(400, "phone must be in 0300-0000000 format");
  if (!/^\d{4}$/.test(String(pin))) throw new HE(400, "pin must be exactly 4 digits");

  const digits = toDigits(phone)!;
  const dup = await query("SELECT id FROM users WHERE phone = ?", [digits]);
  if (dup.length) throw new HE(409, "An account with this phone already exists");

  const pin_hash = bcrypt.hashSync(String(pin), 10);
  const id = newId();
  const created_at = nowIso();
  await run(
    "INSERT INTO users (id, name, phone, shop_name, shop_address, pin_hash, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [id, String(name).trim(), digits, String(shopName).trim(), String(shopAddress).trim(), pin_hash, null, null, "user", created_at]
  );
  const user = { id, name: String(name).trim(), phone: digits, shop_name: String(shopName).trim(), shop_address: String(shopAddress).trim(), email: null, role: "user", created_at };
  const token = signJWT({ sub: id, role: "user" });
  res.status(201).json({ token, user: userShape(user) });
});
