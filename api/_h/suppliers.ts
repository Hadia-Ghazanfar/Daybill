import collectionHandler from "./_h/suppliers";
import byIdHandler from "./_h/suppliers-id";

export default async (req: any, res: any) => {
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
