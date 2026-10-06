const { ensureInit } = require("./_init");
const handler = require("./_h/feedback").default || require("./_h/feedback");
module.exports = async (req: any, res: any) => {
  await ensureInit();
  return handler(req, res);
};
