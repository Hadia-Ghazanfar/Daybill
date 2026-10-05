import collectionHandler from "./_h/invoices";
import byIdHandler from "./_h/invoices-id";

export default async (req: any, res: any) => {
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
