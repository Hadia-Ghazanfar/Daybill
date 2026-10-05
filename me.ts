// GET /api/auth/me
import { requireAuth } from "../_lib/auth";
import { userShape, wrap } from "../_lib/util";

export default wrap(async (req: any, res: any) => {
  const user = await requireAuth(req);
  res.json({ user: userShape(user) });
});
