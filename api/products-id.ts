// PUT /api/products/:id   DELETE /api/products/:id
import { get, run } from "./_db";
import { requireAuth } from "./_auth";
import { productShape, wrap } from "./_util";
import { HttpError as HE } from "./_auth";

async function loadProduct(userId: string, id: string) {
  const p = await get<any>("SELECT * FROM products WHERE id = ? AND user_id = ?", [id, userId]);
  if (!p) throw new HE(404, "Product not found");
  return p;
}

export async function updateProduct(req: any, res: any) {
  const user = await requireAuth(req);
  await loadProduct(user.id, (req.query.id ?? req.params?.id));
  const { name, costPrice, sellingPrice, stock } = req.body || {};
  const updates: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { updates.push("name = ?"); params.push(String(name).trim()); }
  if (costPrice !== undefined) {
    if (isNaN(Number(costPrice))) throw new HE(400, "costPrice must be a number");
    updates.push("cost_price = ?"); params.push(Number(costPrice));
  }
  if (sellingPrice !== undefined) {
    if (isNaN(Number(sellingPrice))) throw new HE(400, "sellingPrice must be a number");
    updates.push("selling_price = ?"); params.push(Number(sellingPrice));
  }
  if (stock !== undefined) {
    if (isNaN(Number(stock)) || Number(stock) < 0) throw new HE(400, "stock must be a non-negative number");
    updates.push("stock = ?"); params.push(Math.floor(Number(stock)));
  }
  if (!updates.length) throw new HE(400, "Nothing to update");
  params.push((req.query.id ?? req.params?.id), user.id);
  await run(`UPDATE products SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, params);
  const fresh = await loadProduct(user.id, (req.query.id ?? req.params?.id));
  res.json({ product: productShape(fresh) });
}

export async function deleteProduct(req: any, res: any) {
  const user = await requireAuth(req);
  await loadProduct(user.id, (req.query.id ?? req.params?.id));
  await run("DELETE FROM products WHERE id = ? AND user_id = ?", [(req.query.id ?? req.params?.id), user.id]);
  res.json({ ok: true });
}

export default wrap(async (req: any, res: any) => {
  if (req.method === "PUT") return updateProduct(req, res);
  if (req.method === "DELETE") return deleteProduct(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
