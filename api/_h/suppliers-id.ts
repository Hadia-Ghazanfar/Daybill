// /api/suppliers/:id — GET (detail+stats+history), PUT, DELETE
const { query, get, run } = require("../_db");
const { requireAuth } = require("../_auth");
const { toDisplay, parsePhone, wrap } = require("../_util");
const { HttpError: HE } = require("../_auth");

async function loadSupplier(userId: string, id: string) {
  const s = await get<any>("SELECT * FROM suppliers WHERE id = ? AND user_id = ?", [id, userId]);
  if (!s) throw new HE(404, "Supplier not found");
  return s;
}

async function getSupplier(req: any, res: any) {
  const user = await requireAuth(req);
  const s = await loadSupplier(user.id, (req.query.id ?? req.params?.id));

  const pur = await query<any>(
    `SELECT p.id, p.type, p.delivered, p.date, p.notes, p.created_at,
            COALESCE((SELECT SUM(qty * cost) FROM purchase_items pi WHERE pi.purchase_id = p.id), 0) AS total,
            (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count
     FROM purchases p
     WHERE p.supplier_id = ? AND p.user_id = ?
     ORDER BY p.date DESC, p.created_at DESC`,
    [s.id, user.id]
  );

  const history = pur.map((p: any) => ({
    id: p.id,
    type: p.type,
    delivered: Number(p.delivered) === 1,
    date: p.date,
    total: Number(p.total) || 0,
    itemCount: Number(p.item_count) || 0,
  }));

  const deliveredOnly = history.filter((p) => p.delivered);
  const stats = {
    totalPurchased: deliveredOnly.reduce((sum, p) => sum + p.total, 0),
    purchaseCount: deliveredOnly.length,
    lastTransaction: deliveredOnly.length ? deliveredOnly[0].date : null,
  };

  res.json({
    supplier: { id: s.id, name: s.name, phone: toDisplay(s.phone), address: s.address ?? null, createdAt: s.created_at },
    stats,
    history,
  });
}

async function updateSupplier(req: any, res: any) {
  const user = await requireAuth(req);
  const s = await loadSupplier(user.id, (req.query.id ?? req.params?.id));
  const { name, phone, address } = req.body || {};
  const updates: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { updates.push("name = ?"); params.push(String(name).trim()); }
  if (phone !== undefined) { updates.push("phone = ?"); params.push(parsePhone(phone)); }
  if (address !== undefined) { updates.push("address = ?"); params.push(address ? String(address).trim() : null); }
  if (updates.length) {
    params.push(s.id, user.id);
    await run(`UPDATE suppliers SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, params);
  }
  const fresh = await loadSupplier(user.id, (req.query.id ?? req.params?.id));
  res.json({
    supplier: { id: fresh.id, name: fresh.name, phone: toDisplay(fresh.phone), address: fresh.address ?? null, createdAt: fresh.created_at },
  });
}

async function deleteSupplier(req: any, res: any) {
  const user = await requireAuth(req);
  await loadSupplier(user.id, (req.query.id ?? req.params?.id));
  await run("DELETE FROM suppliers WHERE id = ? AND user_id = ?", [(req.query.id ?? req.params?.id), user.id]);
  res.json({ ok: true });
}

module.exports = wrap(async (req: any, res: any) => {
  if (req.method === "GET") return getSupplier(req, res);
  if (req.method === "PUT") return updateSupplier(req, res);
  if (req.method === "DELETE") return deleteSupplier(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
