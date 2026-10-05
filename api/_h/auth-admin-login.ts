// POST /api/auth/admin-login  {email, password}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");
import { get } from "../_db";
import { signJWT } from "../_auth";
import { userShape, wrap } from "../_util";
import { HttpError as HE } from "../_auth";

export default wrap(async (req: any, res: any) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HE(400, "email and password are required");
  const row = await get<any>(
    "SELECT id, name, phone, shop_name, shop_address, email, role, created_at, password_hash FROM users WHERE lower(email) = lower(?) AND role = 'admin'",
    [String(email).trim()]
  );
  if (!row || !row.password_hash || !bcrypt.compareSync(String(password), row.password_hash)) {
    throw new HE(401, "Invalid email or password");
  }
  const token = signJWT({ sub: row.id, role: "admin" });
  res.json({ token, user: userShape(row) });
});
