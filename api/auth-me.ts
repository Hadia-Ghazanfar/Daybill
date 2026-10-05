// GET /api/auth/me
import { requireAuth } from "./_auth";
import { userShape, wrap } from "./_util";

export default wrap(async (req: any, res: any) => {
  const user = await requireAuth(req);
  res.json({ user: userShape(user) });
});
