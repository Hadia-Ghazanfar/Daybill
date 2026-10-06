const registerHandler = require("./_h/auth-register").default || require("./_h/auth-register");
const loginHandler = require("./_h/auth-login").default || require("./_h/auth-login");
const adminLoginHandler = require("./_h/auth-admin-login").default || require("./_h/auth-admin-login");
const meHandler = require("./_h/auth-me").default || require("./_h/auth-me");
const profileHandler = require("./_h/auth-profile").default || require("./_h/auth-profile");

const { ensureInit } = require("./_init");

module.exports = async (req: any, res: any) => {
  await ensureInit();
  const action = String(req.query.action || "");
  if (req.method === "POST" && action === "register") return registerHandler(req, res);
  if (req.method === "POST" && action === "login") return loginHandler(req, res);
  if (req.method === "POST" && action === "admin-login") return adminLoginHandler(req, res);
  if (req.method === "GET" && action === "me") return meHandler(req, res);
  if (req.method === "PUT" && action === "profile") return profileHandler(req, res);
  res.status(404).json({ error: "Not found" });
};
