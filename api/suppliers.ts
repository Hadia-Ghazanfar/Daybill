// GET /api/suppliers?q=   POST /api/suppliers
import { query, run } from "./_db";
import { requireAuth } from "./_auth";
import { toDisplay, parsePhone, newId, nowIso, wrap } from "./_util";
import { HttpError as HE } from "./_auth";

const LIST_SQL = `
SELECT s.id, s.name, s.phone, s.address, s.created_at,
       COUNT(p.id) AS purchase_count,
       COALESCE(SUM(COALESCE(t.tot, 0)), 0) AS total_purchased,
       MAX(p.date) AS last_transaction
FROM suppliers s
LEFT JOIN purchases p ON p.supplier_id = s.id AND p.delivered = 1
LEFT JOIN (SELECT purchase_id, SUM(qty * cost) AS tot FROM purchase_items GROUP BY purchase_id) t
  ON t.purchase_id = p.id
WHERE s.user_id = ?
GROUP BY s.id
ORDER BY s.created_at DESC`;

export async function listSuppliers(req: any, res: any) {
  const user = await requireAuth(req);
  const q = String(req.query.q || "").trim();
  let rows: any[];
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    const digits = q.replace(/\D/g, "");
    rows = await query(
      `SELECT * FROM (${LIST_SQL.replace("ORDER BY s.created_at DESC", "")}) x
       WHERE lower(x.name) LIKE ? OR x.phone LIKE ?
       ORDER BY x.created_at DESC`,
      [user.id, like, `%${digits}%`]
    );
  } else {
    rows = await query(LIST_SQL, [user.id]);
  }
  res.json({
    suppliers: rows.map((r: any) => ({
      id: r.id,
      name: r.name ?? null,
      phone: toDisplay(r.phone),
      address: r.address ?? null,
      totalPurchased: Number(r.total_purchased) || 0,
      purchaseCount: Number(r.purchase_count) || 0,
      lastTransaction: r.last_transaction ?? null,
    })),
  });
}

export async function createSupplier(req: any, res: any) {
  const user = await requireAuth(req);
  const { name, phone, address } = req.body || {};
  if (!name) throw new HE(400, "name is required");
  if (!phone) throw new HE(400, "phone is required");
  const digits = parsePhone(phone);
  const id = newId();
  const created_at = nowIso();
  await run("INSERT INTO suppliers (id, user_id, name, phone, address, created_at) VALUES (?,?,?,?,?,?)",
    [id, user.id, String(name).trim(), digits, address ? String(address).trim() : null, created_at]);
  res.status(201).json({
    supplier: { id, name: String(name).trim(), phone: toDisplay(digits), address: address ? String(address).trim() : null, createdAt: created_at },
  });
}

export default wrap(async (req: any, res: any) => {
  if (req.method === "GET") return listSuppliers(req, res);
  if (req.method === "POST") return createSupplier(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
