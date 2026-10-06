// GET /api/auth/me
const { requireAuth } = require("../_auth");
const { userShape, wrap } = require("../_util");

module.exports = wrap(async (req: any, res: any) => {
  const user = await requireAuth(req);
  res.json({ user: userShape(user) });
});
