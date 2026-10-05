// GET /api/products   POST /api/products
import { query, run } from "../_db";
import { requireAuth } from "../_auth";
import { productShape, newId, nowIso, wrap } from "../_util";
import { HttpError as HE } from "../_auth";

export async function listProducts(req: any, res: any) {
  const user = await requireAuth(req);
  const rows = await query<any>("SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC", [user.id]);
  res.json({ products: rows.map(productShape) });
}

export async function createProduct(req: any, res: any) {
  const user = await requireAuth(req);
  const { name, costPrice, sellingPrice, stock } = req.body || {};
  if (!name) throw new HE(400, "name is required");
  if (costPrice === undefined || costPrice === null || isNaN(Number(costPrice))) throw new HE(400, "costPrice is required");
  if (sellingPrice === undefined || sellingPrice === null || isNaN(Number(sellingPrice))) throw new HE(400, "sellingPrice is required");
  const id = newId();
  const created_at = nowIso();
  const stockVal = stock === undefined || stock === null ? 0 : Math.max(0, Math.floor(Number(stock)));
  await run(
    "INSERT INTO products (id, user_id, name, cost_price, selling_price, stock, created_at) VALUES (?,?,?,?,?,?,?)",
    [id, user.id, String(name).trim(), Number(costPrice), Number(sellingPrice), stockVal, created_at]
  );
  res.status(201).json({
    product: { id, name: String(name).trim(), costPrice: Number(costPrice), sellingPrice: Number(sellingPrice), stock: stockVal, createdAt: created_at },
  });
}

export default wrap(async (req: any, res: any) => {
  if (req.method === "GET") return listProducts(req, res);
  if (req.method === "POST") return createProduct(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
