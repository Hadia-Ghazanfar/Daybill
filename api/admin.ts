const accountsHandler = require("./_h/admin-accounts").default || require("./_h/admin-accounts");
const { ensureInit } = require("./_init");

module.exports = async (req: any, res: any) => {
  await ensureInit();
  const action = String(req.query.action || "");
  if (action === "accounts") return accountsHandler(req, res);
  res.status(404).json({ error: "Not found" });
};
