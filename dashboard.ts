// GET /api/dashboard?range=7d|1m|3m|6m|9m|1y|lifetime
import { query } from "./_lib/db";
import { requireAuth } from "./_lib/auth";
import { wrap } from "./_lib/util";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "9m": 270,
  "1y": 365,
};

function dayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default wrap(async (req: any, res: any) => {
  const user = await requireAuth(req);
  const range = String(req.query.range || "7d");
  const days = RANGE_DAYS[range] ?? 7;
  const isLifetime = range === "lifetime";

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const startStr = dayStr(start);

  const rangeFilter = isLifetime ? "" : "AND i.date >= ?";
  const rangeParams = isLifetime ? [] : [startStr];

  // Revenue + per-invoice totals in range
  const revRows = await query<any>(
    `SELECT i.id, i.date, i.due_status,
            COALESCE((SELECT SUM(qty * price) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0) - COALESCE(i.discount, 0) AS total
     FROM invoices i
     WHERE i.user_id = ? ${rangeFilter}`,
    [user.id, ...rangeParams]
  );

  const revenue = revRows.reduce((s: number, r: any) => s + Math.max(0, Number(r.total)), 0);

  // Cost: qty * product cost_price at (current) sale time, in range
  const costRows = await query<any>(
    `SELECT COALESCE(SUM(ii.qty * COALESCE(p.cost_price, 0)), 0) AS cost
     FROM invoice_items ii
     JOIN invoices i ON i.id = ii.invoice_id
     LEFT JOIN products p ON p.id = ii.product_id
     WHERE i.user_id = ? ${rangeFilter.replace(/i\.date/g, "i.date")}`,
    [user.id, ...rangeParams]
  );
  const cost = Number(costRows[0]?.cost) || 0;

  // Customer dues: lifetime pending invoice totals
  const dueRows = await query<any>(
    `SELECT COALESCE(SUM(COALESCE((SELECT SUM(qty * price) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0) - COALESCE(i.discount, 0)), 0) AS dues
     FROM invoices i
     WHERE i.user_id = ? AND i.due_status != 'paid'`,
    [user.id]
  );
  const customerDues = Number(dueRows[0]?.dues) || 0;

  // Supplier payables: all delivered purchases count as payable (lifetime)
  const payRows = await query<any>(
    `SELECT COALESCE(SUM(COALESCE((SELECT SUM(qty * cost) FROM purchase_items pi WHERE pi.purchase_id = p.id), 0)), 0) AS payables
     FROM purchases p
     WHERE p.user_id = ? AND p.delivered = 1`,
    [user.id]
  );
  const supplierPayables = Number(payRows[0]?.payables) || 0;

  // Received: lifetime paid invoice totals
  const recRows = await query<any>(
    `SELECT COALESCE(SUM(COALESCE((SELECT SUM(qty * price) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0) - COALESCE(i.discount, 0)), 0) AS received
     FROM invoices i
     WHERE i.user_id = ? AND i.due_status = 'paid'`,
    [user.id]
  );
  const received = Number(recRows[0]?.received) || 0;

  // Series: per-day revenue from start → today (lifetime → last 30 days)
  const seriesDays = isLifetime ? 30 : days;
  const seriesStart = new Date(today);
  seriesStart.setDate(seriesStart.getDate() - (seriesDays - 1));
  const seriesStartStr = dayStr(seriesStart);
  const seriesRows = await query<any>(
    `SELECT i.date AS d,
            SUM(COALESCE((SELECT SUM(qty * price) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0) - COALESCE(i.discount, 0)) AS revenue
     FROM invoices i
     WHERE i.user_id = ? AND i.date >= ?
     GROUP BY i.date`,
    [user.id, seriesStartStr]
  );
  const byDate: Record<string, number> = {};
  for (const r of seriesRows) byDate[String(r.d)] = Math.max(0, Number(r.revenue));
  const series: { date: string; revenue: number }[] = [];
  for (let n = 0; n < seriesDays; n++) {
    const d = new Date(seriesStart);
    d.setDate(d.getDate() + n);
    const key = dayStr(d);
    series.push({ date: key, revenue: byDate[key] || 0 });
  }

  // Recent activity: latest invoices + purchases, newest first
  const recentInv = await query<any>(
    `SELECT i.id, i.invoice_no, i.date, i.created_at, c.name AS customer_name,
            COALESCE((SELECT SUM(qty * price) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0) - COALESCE(i.discount, 0) AS total
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.user_id = ?
     ORDER BY i.created_at DESC LIMIT 8`,
    [user.id]
  );
  const recentPur = await query<any>(
    `SELECT p.id, p.type, p.delivered, p.date, p.created_at, s.name AS supplier_name,
            COALESCE((SELECT SUM(qty * cost) FROM purchase_items pi WHERE pi.purchase_id = p.id), 0) AS total
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC LIMIT 8`,
    [user.id]
  );
  const recentActivity = [
    ...recentInv.map((r: any) => ({
      kind: "invoice",
      id: r.id,
      label: `${r.invoice_no}${r.customer_name ? " · " + r.customer_name : ""}`,
      date: r.date,
      total: Math.max(0, Number(r.total)),
      createdAt: r.created_at,
    })),
    ...recentPur.map((r: any) => ({
      kind: "purchase",
      id: r.id,
      label: `${r.type === "purchase_order" ? "Purchase Order" : "Delivered Purchase"}${r.supplier_name ? " · " + r.supplier_name : ""}`,
      date: r.date,
      total: Number(r.total) || 0,
      createdAt: r.created_at,
    })),
  ]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 10);

  res.json({
    revenue,
    cost,
    profit: revenue - cost,
    customerDues,
    supplierPayables,
    received,
    series,
    recentActivity,
  });
});
