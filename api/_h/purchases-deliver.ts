// POST /api/purchases/:id/deliver — mark delivered, stock++ (idempotent: 409 if already delivered)
const { query, get, run } = require("../_db");
const { requireAuth } = require("../_auth");
const { wrap } = require("../_util");
const { HttpError as HE } = require("../_auth");

module.exports = wrap(async (req: any, res: any) => {
  const user = await requireAuth(req);
  const p = await get<any>("SELECT * FROM purchases WHERE id = ? AND user_id = ?", [(req.query.id ?? req.params?.id), user.id]);
  if (!p) throw new HE(404, "Purchase not found");
  if (Number(p.delivered) === 1) throw new HE(409, "Purchase is already delivered");

  const items = await query<any>("SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?", [p.id]);
  await run("UPDATE purchases SET delivered = 1 WHERE id = ? AND user_id = ?", [p.id, user.id]);
  for (const it of items) {
    await run("UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?", [Number(it.qty), it.product_id, user.id]);
  }

  res.json({ ok: true, delivered: true });
});
