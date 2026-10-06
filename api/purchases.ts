const collectionHandler = require("./_h/purchases").default || require("./_h/purchases");
const byIdHandler = require("./_h/purchases-id").default || require("./_h/purchases-id");
const deliverHandler = require("./_h/purchases-deliver").default || require("./_h/purchases-deliver");

const { ensureInit } = require("./_init");

module.exports = async (req: any, res: any) => {
  await ensureInit();
  if (req.query.id && req.query.action === "deliver") return deliverHandler(req, res);
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
