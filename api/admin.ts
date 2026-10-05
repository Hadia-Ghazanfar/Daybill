import accountsHandler from "./_h/admin-accounts";
export default async (req: any, res: any) => {
  const action = String(req.query.action || "");
  if (action === "accounts") return accountsHandler(req, res);
  res.status(404).json({ error: "Not found" });
};
