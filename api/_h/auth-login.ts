// POST /api/auth/login  {phone, pin}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");
const { get } = require("../_db");
const { signJWT } = require("../_auth");
const { userShape, toDigits, wrap } = require("../_util");
const { HttpError: HE } = require("../_auth");

module.exports = wrap(async (req: any, res: any) => {
  const { phone, pin } = req.body || {};
  if (!phone || !pin) throw new HE(400, "phone and pin are required");
  const digits = toDigits(phone);
  const row = await get<any>(
    "SELECT id, name, phone, shop_name, shop_address, email, role, created_at, pin_hash FROM users WHERE phone = ?",
    [digits]
  );
  if (!row || row.role !== "user" || !row.pin_hash || !bcrypt.compareSync(String(pin), row.pin_hash)) {
    throw new HE(401, "Invalid phone or PIN");
  }
  const token = signJWT({ sub: row.id, role: row.role });
  res.json({ token, user: userShape(row) });
});
