// GET /api/admin/accounts — admin only, role='user' only, newest first, NEVER hashes
const { query } = require("../_db");
const { requireAdmin } = require("../_auth");
const { toDisplay, wrap } = require("../_util");

module.exports = wrap(async (req: any, res: any) => {
  await requireAdmin(req);
  const rows = await query<any>(
    "SELECT id, name, phone, shop_name, shop_address, created_at FROM users WHERE role = 'user' ORDER BY created_at DESC",
    []
  );
  res.json({
    accounts: rows.map((r: any) => ({
      id: r.id,
      name: r.name ?? null,
      phone: toDisplay(r.phone),
      shopName: r.shop_name ?? null,
      shopAddress: r.shop_address ?? null,
      createdAt: r.created_at,
    })),
  });
});
