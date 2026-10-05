// GET /api/purchases/:id — detail with items + supplier
import { query, get } from "../_db";
import { requireAuth } from "../_auth";
import { toDisplay, wrap } from "../_util";
import { HttpError as HE } from "../_auth";

export default wrap(async (req: any, res: any) => {
  const user = await requireAuth(req);
  const p = await get<any>("SELECT * FROM purchases WHERE id = ? AND user_id = ?", [(req.query.id ?? req.params?.id), user.id]);
  if (!p) throw new HE(404, "Purchase not found");

  const items = await query<any>(
    `SELECT pi.id, pi.product_id, pi.qty, pi.cost, pr.name AS product_name
     FROM purchase_items pi
     LEFT JOIN products pr ON pr.id = pi.product_id
     WHERE pi.purchase_id = ?`,
    [p.id]
  );

  const supplier = p.supplier_id
    ? await get<any>("SELECT id, name, phone, address FROM suppliers WHERE id = ?", [p.supplier_id])
    : null;

  res.json({
    purchase: {
      id: p.id,
      type: p.type,
      delivered: Number(p.delivered) === 1,
      date: p.date,
      notes: p.notes ?? null,
      total: items.reduce((s: number, it: any) => s + Number(it.qty) * Number(it.cost), 0),
      createdAt: p.created_at,
    },
    items: items.map((it: any) => ({ id: it.id, productId: it.product_id, productName: it.product_name ?? null, qty: it.qty, cost: Number(it.cost) })),
    supplier: supplier
      ? { id: supplier.id, name: supplier.name, phone: toDisplay(supplier.phone), address: supplier.address ?? null }
      : null,
  });
});
