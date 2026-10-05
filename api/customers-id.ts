// /api/customers/:id — GET (detail+stats+history), PUT, DELETE
import { query, get, run } from "./_db";
import { requireAuth } from "./_auth";
import { toDisplay, parsePhone, wrap } from "./_util";
import { HttpError as HE } from "./_auth";

async function loadCustomer(userId: string, id: string) {
  const c = await get<any>("SELECT * FROM customers WHERE id = ? AND user_id = ?", [id, userId]);
  if (!c) throw new HE(404, "Customer not found");
  return c;
}

export async function getCustomer(req: any, res: any) {
  const user = await requireAuth(req);
  const c = await loadCustomer(user.id, (req.query.id ?? req.params?.id));

  const invs = await query<any>(
    `SELECT i.id, i.invoice_no, i.date, i.discount, i.payment_method, i.due_status, i.accent_color, i.notes, i.created_at,
            COALESCE((SELECT SUM(qty * price) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0) AS subtotal,
            (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS item_count
     FROM invoices i
     WHERE i.customer_id = ? AND i.user_id = ?
     ORDER BY i.date DESC, i.created_at DESC`,
    [c.id, user.id]
  );

  const withTotals = invs.map((i: any) => ({
    id: i.id,
    invoiceNo: i.invoice_no,
    date: i.date,
    total: Math.max(0, Number(i.subtotal) - Number(i.discount || 0)),
    paymentMethod: i.payment_method ?? null,
    dueStatus: i.due_status || "pending",
    itemCount: Number(i.item_count) || 0,
  }));

  const stats = {
    totalBilled: withTotals.reduce((s, i) => s + i.total, 0),
    invoiceCount: withTotals.length,
    paidTotal: withTotals.filter((i) => i.dueStatus === "paid").reduce((s, i) => s + i.total, 0),
    pendingTotal: withTotals.filter((i) => i.dueStatus !== "paid").reduce((s, i) => s + i.total, 0),
    lastTransaction: withTotals.length ? withTotals[0].date : null,
  };

  res.json({
    customer: { id: c.id, name: c.name, phone: toDisplay(c.phone), address: c.address ?? null, createdAt: c.created_at },
    stats,
    history: withTotals,
  });
}

export async function updateCustomer(req: any, res: any) {
  const user = await requireAuth(req);
  const c = await loadCustomer(user.id, (req.query.id ?? req.params?.id));
  const { name, phone, address } = req.body || {};
  const updates: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { updates.push("name = ?"); params.push(String(name).trim()); }
  if (phone !== undefined) { updates.push("phone = ?"); params.push(parsePhone(phone)); }
  if (address !== undefined) { updates.push("address = ?"); params.push(address ? String(address).trim() : null); }
  if (updates.length) {
    params.push(c.id, user.id);
    await run(`UPDATE customers SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, params);
  }
  const fresh = await loadCustomer(user.id, (req.query.id ?? req.params?.id));
  res.json({
    customer: { id: fresh.id, name: fresh.name, phone: toDisplay(fresh.phone), address: fresh.address ?? null, createdAt: fresh.created_at },
  });
}

export async function deleteCustomer(req: any, res: any) {
  const user = await requireAuth(req);
  await loadCustomer(user.id, (req.query.id ?? req.params?.id));
  await run("DELETE FROM customers WHERE id = ? AND user_id = ?", [(req.query.id ?? req.params?.id), user.id]);
  res.json({ ok: true });
}

export default wrap(async (req: any, res: any) => {
  if (req.method === "GET") return getCustomer(req, res);
  if (req.method === "PUT") return updateCustomer(req, res);
  if (req.method === "DELETE") return deleteCustomer(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
