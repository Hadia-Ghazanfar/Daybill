import collectionHandler from "./_h/products";
import byIdHandler from "./_h/products-id";

export default async (req: any, res: any) => {
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
