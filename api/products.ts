const collectionHandler = require("./_h/products").default || require("./_h/products");
const byIdHandler = require("./_h/products-id").default || require("./_h/products-id");

const { ensureInit } = require("./_init");

module.exports = async (req: any, res: any) => {
  await ensureInit();
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
