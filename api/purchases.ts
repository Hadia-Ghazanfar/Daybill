import collectionHandler from "./_h/purchases";
import byIdHandler from "./_h/purchases-id";
import deliverHandler from "./_h/purchases-deliver";

export default async (req: any, res: any) => {
  if (req.query.id && req.query.action === "deliver") return deliverHandler(req, res);
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
