// GET /api/customers?q=   POST /api/customers
import { query, run } from "./_lib/db";
import { requireAuth } from "./_lib/auth";
import { toDisplay, parsePhone, newId, nowIso, wrap } from "./_lib/util";
import { HttpError as HE } from "./_lib/auth";

const LIST_SQL = `
SELECT c.id, c.name, c.phone, c.address, c.created_at,
       COUNT(i.id) AS invoice_count,
       COALESCE(SUM(COALESCE(t.tot, 0) - COALESCE(i.discount, 0)), 0) AS total_billed,
       MAX(i.date) AS last_transaction
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
LEFT JOIN (SELECT invoice_id, SUM(qty * price) AS tot FROM invoice_items GROUP BY invoice_id) t
  ON t.invoice_id = i.id
WHERE c.user_id = ?
GROUP BY c.id
ORDER BY c.created_at DESC`;

export async function listCustomers(req: any, res: any) {
  const user = await requireAuth(req);
  const q = String(req.query.q || "").trim();
  let rows: any[];
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    const digits = q.replace(/\D/g, "");
    rows = await query(
      `SELECT * FROM (${LIST_SQL.replace("ORDER BY c.created_at DESC", "")}) s
       WHERE lower(s.name) LIKE ? OR s.phone LIKE ?
       ORDER BY s.created_at DESC`,
      [user.id, like, `%${digits}%`]
    );
  } else {
    rows = await query(LIST_SQL, [user.id]);
  }
  res.json({
    customers: rows.map((r: any) => ({
      id: r.id,
      name: r.name ?? null,
      phone: toDisplay(r.phone),
      address: r.address ?? null,
      totalBilled: Number(r.total_billed) || 0,
      invoiceCount: Number(r.invoice_count) || 0,
      lastTransaction: r.last_transaction ?? null,
    })),
  });
}

export async function createCustomer(req: any, res: any) {
  const user = await requireAuth(req);
  const { name, phone, address } = req.body || {};
  if (!name) throw new HE(400, "name is required");
  if (!phone) throw new HE(400, "phone is required");
  const digits = parsePhone(phone);
  const id = newId();
  const created_at = nowIso();
  await run("INSERT INTO customers (id, user_id, name, phone, address, created_at) VALUES (?,?,?,?,?,?)",
    [id, user.id, String(name).trim(), digits, address ? String(address).trim() : null, created_at]);
  res.status(201).json({
    customer: { id, name: String(name).trim(), phone: toDisplay(digits), address: address ? String(address).trim() : null, createdAt: created_at },
  });
}

export default wrap(async (req: any, res: any) => {
  if (req.method === "GET") return listCustomers(req, res);
  if (req.method === "POST") return createCustomer(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
