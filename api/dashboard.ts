const { ensureInit } = require("./_init");
const handler = require("./_h/dashboard").default || require("./_h/dashboard");
module.exports = async (req: any, res: any) => {
  await ensureInit();
  return handler(req, res);
};
