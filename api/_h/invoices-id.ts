// GET /api/invoices/:id — detail with items + customer
const { query, get } = require("../_db");
const { requireAuth } = require("../_auth");
const { toDisplay, invoiceTotal, wrap } = require("../_util");
const { HttpError as HE } = require("../_auth");

module.exports = wrap(async (req: any, res: any) => {
  const user = await requireAuth(req);
  const inv = await get<any>("SELECT * FROM invoices WHERE id = ? AND user_id = ?", [(req.query.id ?? req.params?.id), user.id]);
  if (!inv) throw new HE(404, "Invoice not found");

  const items = await query<any>(
    `SELECT ii.id, ii.product_id, ii.qty, ii.price, p.name AS product_name
     FROM invoice_items ii
     LEFT JOIN products p ON p.id = ii.product_id
     WHERE ii.invoice_id = ?`,
    [inv.id]
  );

  const customer = inv.customer_id
    ? await get<any>("SELECT id, name, phone, address FROM customers WHERE id = ?", [inv.customer_id])
    : null;

  const itemRows = items.map((it: any) => ({ id: it.id, productId: it.product_id, productName: it.product_name ?? null, qty: it.qty, price: Number(it.price) }));

  res.json({
    invoice: {
      id: inv.id,
      invoiceNo: inv.invoice_no,
      date: inv.date,
      discount: Number(inv.discount) || 0,
      paymentMethod: inv.payment_method ?? null,
      dueStatus: inv.due_status || "pending",
      accentColor: inv.accent_color ?? null,
      notes: inv.notes ?? null,
      total: invoiceTotal(itemRows, Number(inv.discount) || 0),
      createdAt: inv.created_at,
    },
    items: itemRows,
    customer: customer
      ? { id: customer.id, name: customer.name, phone: toDisplay(customer.phone), address: customer.address ?? null }
      : null,
  });
});
