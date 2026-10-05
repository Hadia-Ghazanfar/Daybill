// GET /api/purchases   POST /api/purchases
import { query, get, run } from "../_db";
import { requireAuth } from "../_auth";
import { newId, nowIso, wrap } from "../_util";
import { HttpError as HE } from "../_auth";

export async function listPurchases(req: any, res: any) {
  const user = await requireAuth(req);
  const rows = await query<any>(
    `SELECT p.id, p.type, p.delivered, p.date, p.notes, p.created_at,
            s.name AS supplier_name,
            COALESCE((SELECT SUM(qty * cost) FROM purchase_items pi WHERE pi.purchase_id = p.id), 0) AS total,
            (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.user_id = ?
     ORDER BY p.date DESC, p.created_at DESC`,
    [user.id]
  );
  res.json({
    purchases: rows.map((p: any) => ({
      id: p.id,
      supplierName: p.supplier_name ?? null,
      type: p.type,
      delivered: Number(p.delivered) === 1,
      date: p.date,
      total: Number(p.total) || 0,
      itemCount: Number(p.item_count) || 0,
    })),
  });
}

export async function createPurchase(req: any, res: any) {
  const user = await requireAuth(req);
  const { supplierId, date, type, items, notes } = req.body || {};
  if (!supplierId) throw new HE(400, "supplierId is required");
  if (!date) throw new HE(400, "date is required");
  if (type !== "purchase_order" && type !== "delivered_purchase") {
    throw new HE(400, "type must be 'purchase_order' or 'delivered_purchase'");
  }
  if (!Array.isArray(items) || items.length === 0) throw new HE(400, "items must be a non-empty array");

  const supplier = await get("SELECT id FROM suppliers WHERE id = ? AND user_id = ?", [supplierId, user.id]);
  if (!supplier) throw new HE(404, "Supplier not found");

  const normItems: { productId: string; qty: number; cost: number }[] = [];
  for (const it of items) {
    const qty = Math.floor(Number(it.qty));
    const cost = Number(it.cost);
    if (!it.productId || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
      throw new HE(400, "Each item needs productId, positive qty and non-negative cost");
    }
    const product = await get("SELECT id FROM products WHERE id = ? AND user_id = ?", [it.productId, user.id]);
    if (!product) throw new HE(404, `Product not found: ${it.productId}`);
    normItems.push({ productId: it.productId, qty, cost });
  }

  const delivered = type === "delivered_purchase" ? 1 : 0;
  const id = newId();
  const created_at = nowIso();
  await run(
    "INSERT INTO purchases (id, user_id, supplier_id, type, delivered, date, notes, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [id, user.id, supplierId, type, delivered, String(date), notes ?? null, created_at]
  );
  for (const it of normItems) {
    await run("INSERT INTO purchase_items (id, purchase_id, product_id, qty, cost) VALUES (?,?,?,?,?)",
      [newId(), id, it.productId, it.qty, it.cost]);
    if (delivered === 1) {
      await run("UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?", [it.qty, it.productId, user.id]);
    }
  }

  const total = normItems.reduce((s, it) => s + it.qty * it.cost, 0);
  res.status(201).json({
    purchase: { id, type, delivered: delivered === 1, date: String(date), total, itemCount: normItems.length, createdAt: created_at },
  });
}

export default wrap(async (req: any, res: any) => {
  if (req.method === "GET") return listPurchases(req, res);
  if (req.method === "POST") return createPurchase(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
