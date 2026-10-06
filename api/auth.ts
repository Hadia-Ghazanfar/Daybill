import registerHandler from "./_h/auth-register";
import loginHandler from "./_h/auth-login";
import adminLoginHandler from "./_h/auth-admin-login";
import meHandler from "./_h/auth-me";

import { ensureInit } from "./_init";

export default async (req: any, res: any) => {
  await ensureInit();
  const action = String(req.query.action || "");
  if (req.method === "POST" && action === "register") return registerHandler(req, res);
  if (req.method === "POST" && action === "login") return loginHandler(req, res);
  if (req.method === "POST" && action === "admin-login") return adminLoginHandler(req, res);
  if (req.method === "GET" && action === "me") return meHandler(req, res);
  res.status(404).json({ error: "Not found" });
};
