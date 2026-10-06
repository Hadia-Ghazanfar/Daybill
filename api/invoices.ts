const collectionHandler = require("./_h/invoices").default || require("./_h/invoices");
const byIdHandler = require("./_h/invoices-id").default || require("./_h/invoices-id");

const { ensureInit } = require("./_init");

module.exports = async (req: any, res: any) => {
  await ensureInit();
  if (req.query.id) return byIdHandler(req, res);
  return collectionHandler(req, res);
};
