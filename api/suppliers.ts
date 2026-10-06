const collectionHandler = require("./_h/suppliers").default || require("./_h/suppliers");
const byIdHandler = require("./_h/suppliers-id").default || require("./_h/suppliers-id");

const { ensureInit } = require("./_init");

module.exports = async (req: any, res: any) => {
  await ensureInit();
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
