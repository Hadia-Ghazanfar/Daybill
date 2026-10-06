import collectionHandler from "./_h/invoices";
import byIdHandler from "./_h/invoices-id";

import { ensureInit } from "./_init";

export default async (req: any, res: any) => {
  await ensureInit();
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
