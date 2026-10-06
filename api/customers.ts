const collectionHandler = require("./_h/customers").default || require("./_h/customers");
const byIdHandler = require("./_h/customers-id").default || require("./_h/customers-id");

const { ensureInit } = require("./_init");

module.exports = async (req: any, res: any) => {
  await ensureInit();
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
