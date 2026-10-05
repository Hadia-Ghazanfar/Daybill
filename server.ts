// Local-dev Express server. Mounts every api/* handler at its /api/* path.
// (Vercel serves api/**/*.ts as serverless functions automatically in production.)
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";

import { migrate } from "./api/_lib/schema";
import { seedAdmin } from "./api/_lib/seed";

import register from "./api/auth/register";
import login from "./api/auth/login";
import adminLogin from "./api/auth/admin-login";
import me from "./api/auth/me";
import customers from "./api/customers";
import customerDetail from "./api/customers/[id]";
import suppliers from "./api/suppliers";
import supplierDetail from "./api/suppliers/[id]";
import products from "./api/products";
import productDetail from "./api/products/[id]";
import invoices from "./api/invoices";
import invoiceDetail from "./api/invoices/[id]";
import purchases from "./api/purchases";
import purchaseDetail from "./api/purchases/[id]";
import purchaseDeliver from "./api/purchases/[id]/deliver";
import dashboard from "./api/dashboard";
import feedback from "./api/feedback";
import adminAccounts from "./api/admin/accounts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Auth
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/admin-login", adminLogin);
app.get("/api/auth/me", me);

// Contacts
app.get("/api/customers", customers);
app.post("/api/customers", customers);
app.get("/api/customers/:id", customerDetail);
app.put("/api/customers/:id", customerDetail);
app.delete("/api/customers/:id", customerDetail);

app.get("/api/suppliers", suppliers);
app.post("/api/suppliers", suppliers);
app.get("/api/suppliers/:id", supplierDetail);
app.put("/api/suppliers/:id", supplierDetail);
app.delete("/api/suppliers/:id", supplierDetail);

// Products
app.get("/api/products", products);
app.post("/api/products", products);
app.put("/api/products/:id", productDetail);
app.delete("/api/products/:id", productDetail);

// Invoices
app.get("/api/invoices", invoices);
app.post("/api/invoices", invoices);
app.get("/api/invoices/:id", invoiceDetail);

// Purchases
app.get("/api/purchases", purchases);
app.post("/api/purchases", purchases);
app.get("/api/purchases/:id", purchaseDetail);
app.post("/api/purchases/:id/deliver", purchaseDeliver);

// Dashboard + feedback + admin
app.get("/api/dashboard", dashboard);
app.get("/api/feedback", feedback);
app.post("/api/feedback", feedback);
app.get("/api/admin/accounts", adminAccounts);

app.get("/api/health", (_req: any, res: any) => res.json({ ok: true }));

// Optional: serve the built frontend (same-origin) when SERVE_STATIC=1
if (process.env.SERVE_STATIC === "1") {
  const dist = path.resolve(__dirname, "frontend", "dist");
  app.use(express.static(dist));
  app.get("*", (_req: any, res: any) => res.sendFile(path.join(dist, "index.html")));
}

const PORT = Number(process.env.PORT || 3001);

async function boot() {
  await migrate();
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`Daybill API listening on http://localhost:${PORT}`);
  });
}

boot().catch((err) => {
  console.error("Failed to boot Daybill API:", err);
  process.exit(1);
});
