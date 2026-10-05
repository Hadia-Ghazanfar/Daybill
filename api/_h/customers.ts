import collectionHandler from "./_h/customers";
import byIdHandler from "./_h/customers-id";

export default async (req: any, res: any) => {
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
