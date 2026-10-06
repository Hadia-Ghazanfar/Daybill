// GET /api/invoices?status=&q=   POST /api/invoices
const { query, get, run } = require("../_db");
const { requireAuth } = require("../_auth");
const { newId, nowIso, invoiceTotal, wrap } = require("../_util");
const { HttpError: HE } = require("../_auth");

async function listInvoices(req: any, res: any) {
  const user = await requireAuth(req);
  const status = String(req.query.status || "").trim(); // 'paid' | 'pending' | ''
  const q = String(req.query.q || "").trim().toLowerCase();

  const rows = await query<any>(
    `SELECT i.id, i.invoice_no, i.date, i.customer_id, i.discount, i.payment_method, i.due_status, i.created_at,
            c.name AS customer_name,
            COALESCE((SELECT SUM(qty * price) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0) AS subtotal,
            (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS item_count
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.user_id = ?
     ORDER BY i.date DESC, i.created_at DESC`,
    [user.id]
  );

  let invoices = rows.map((r: any) => ({
    id: r.id,
    invoiceNo: r.invoice_no,
    date: r.date,
    customerId: r.customer_id,
    customerName: r.customer_name ?? null,
    total: Math.max(0, Number(r.subtotal) - Number(r.discount || 0)),
    paymentMethod: r.payment_method ?? null,
    dueStatus: r.due_status || "pending",
    itemCount: Number(r.item_count) || 0,
  }));

  if (status === "paid") invoices = invoices.filter((i) => i.dueStatus === "paid");
  else if (status === "pending") invoices = invoices.filter((i) => i.dueStatus !== "paid");
  if (q) {
    invoices = invoices.filter(
      (i) =>
        (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)) ||
        (i.customerName && i.customerName.toLowerCase().includes(q))
    );
  }

  const summary = {
    total: invoices.reduce((s, i) => s + i.total, 0),
    paid: invoices.filter((i) => i.dueStatus === "paid").reduce((s, i) => s + i.total, 0),
    pending: invoices.filter((i) => i.dueStatus !== "paid").reduce((s, i) => s + i.total, 0),
  };
  res.json({ invoices, summary });
}

async function createInvoice(req: any, res: any) {
  const user = await requireAuth(req);
  const { customerId, date, items, discount, paymentMethod, dueStatus, accentColor, notes } = req.body || {};
  if (!customerId) throw new HE(400, "customerId is required");
  if (!date) throw new HE(400, "date is required");
  if (!Array.isArray(items) || items.length === 0) throw new HE(400, "items must be a non-empty array");

  const customer = await get("SELECT id FROM customers WHERE id = ? AND user_id = ?", [customerId, user.id]);
  if (!customer) throw new HE(404, "Customer not found");

  // Validate items + stock first (all-or-nothing)
  const normItems: { productId: string; qty: number; price: number }[] = [];
  for (const it of items) {
    const qty = Math.floor(Number(it.qty));
    const price = Number(it.price);
    if (!it.productId || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      throw new HE(400, "Each item needs productId, positive qty and non-negative price");
    }
    const product = await get<any>("SELECT id, name, stock FROM products WHERE id = ? AND user_id = ?", [it.productId, user.id]);
    if (!product) throw new HE(404, `Product not found: ${it.productId}`);
    if (Number(product.stock) < qty) {
      throw new HE(409, `Insufficient stock for "${product.name}": have ${product.stock}, need ${qty}`);
    }
    normItems.push({ productId: it.productId, qty, price });
  }

  const count = await get<any>("SELECT COUNT(*) AS n FROM invoices WHERE user_id = ?", [user.id]);
  const invoice_no = `INV-${String(Number(count?.n || 0) + 1).padStart(4, "0")}`;
  const id = newId();
  const created_at = nowIso();
  const disc = discount === undefined || discount === null ? 0 : Number(discount);
  if (isNaN(disc) || disc < 0) throw new HE(400, "discount must be a non-negative number");

  await run(
    "INSERT INTO invoices (id, user_id, customer_id, invoice_no, date, discount, payment_method, due_status, accent_color, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [id, user.id, customerId, invoice_no, String(date), disc, paymentMethod ?? null, dueStatus || "pending", accentColor ?? null, notes ?? null, created_at]
  );
  for (const it of normItems) {
    await run("INSERT INTO invoice_items (id, invoice_id, product_id, qty, price) VALUES (?,?,?,?,?)",
      [newId(), id, it.productId, it.qty, it.price]);
    await run("UPDATE products SET stock = stock - ? WHERE id = ? AND user_id = ?", [it.qty, it.productId, user.id]);
  }

  const total = invoiceTotal(normItems, disc);
  res.status(201).json({
    invoice: {
      id,
      invoiceNo: invoice_no,
      date: String(date),
      customerId,
      total,
      paymentMethod: paymentMethod ?? null,
      dueStatus: dueStatus || "pending",
      itemCount: normItems.length,
      createdAt: created_at,
    },
  });
}

module.exports = wrap(async (req: any, res: any) => {
  if (req.method === "GET") return listInvoices(req, res);
  if (req.method === "POST") return createInvoice(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
