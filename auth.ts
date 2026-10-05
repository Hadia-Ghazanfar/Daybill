// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");
import { get } from "./db";

export interface AuthUser {
  id: string;
  name: string | null;
  phone: string | null;
  shop_name: string | null;
  shop_address: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

export interface ReqLike {
  headers: { [key: string]: any };
}

function getSecret(): string {
  return process.env.JWT_SECRET || "daybill-dev-secret-change-me";
}

export function signJWT(payload: { sub: string; role: string }): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "30d" });
}

export function verifyJWT(token: string): { sub: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as { sub: string; role: string };
    if (!decoded || !decoded.sub) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(req: ReqLike): string | null {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) {
    return h.slice(7).trim();
  }
  return null;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Return the authenticated user row, or throw HttpError(401). */
export async function requireAuth(req: ReqLike): Promise<AuthUser> {
  const token = getTokenFromHeader(req);
  if (!token) throw new HttpError(401, "Missing authorization token");
  const payload = verifyJWT(token);
  if (!payload) throw new HttpError(401, "Invalid or expired token");
  const user = await get<AuthUser>(
    "SELECT id, name, phone, shop_name, shop_address, email, role, created_at FROM users WHERE id = ?",
    [payload.sub]
  );
  if (!user) throw new HttpError(401, "User not found");
  return user;
}

/** Return the authenticated admin user, or throw HttpError(401/403). */
export async function requireAdmin(req: ReqLike): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== "admin") throw new HttpError(403, "Admin access required");
  return user;
}
