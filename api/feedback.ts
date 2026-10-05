// GET /api/feedback (admin)   POST /api/feedback (auth user)
import { query, run } from "../_db";
import { requireAuth, requireAdmin } from "../_auth";
import { toDisplay, newId, nowIso, wrap } from "../_util";
import { HttpError as HE } from "../_auth";

const CATEGORIES = ["Bug", "Suggestion", "Other"];

export async function submitFeedback(req: any, res: any) {
  const user = await requireAuth(req);
  const { category, message } = req.body || {};
  if (!category || !CATEGORIES.includes(category)) throw new HE(400, "category must be Bug, Suggestion or Other");
  if (!message || !String(message).trim()) throw new HE(400, "message is required");
  await run("INSERT INTO feedback (id, user_id, category, message, created_at) VALUES (?,?,?,?,?)",
    [newId(), user.id, category, String(message).trim(), nowIso()]);
  res.status(201).json({ ok: true });
}

export async function listFeedback(req: any, res: any) {
  await requireAdmin(req);
  const rows = await query<any>(
    `SELECT f.id, f.user_id, f.category, f.message, f.created_at,
            u.name AS sender_name, u.shop_name, u.phone
     FROM feedback f
     LEFT JOIN users u ON u.id = f.user_id
     ORDER BY f.created_at DESC`,
    []
  );
  res.json({
    feedback: rows.map((r: any) => ({
      id: r.id,
      senderName: r.sender_name ?? null,
      shopName: r.shop_name ?? null,
      phone: toDisplay(r.phone),
      category: r.category,
      message: r.message,
      createdAt: r.created_at,
    })),
  });
}

export default wrap(async (req: any, res: any) => {
  if (req.method === "GET") return listFeedback(req, res);
  if (req.method === "POST") return submitFeedback(req, res);
  res.status(405).json({ error: "Method not allowed" });
});
