import accountsHandler from "./_h/admin-accounts";
import { ensureInit } from "./_init";

export default async (req: any, res: any) => {
  await ensureInit();
  const action = String(req.query.action || "");
  if (action === "accounts") return accountsHandler(req, res);
  res.status(404).json({ error: "Not found" });
};
