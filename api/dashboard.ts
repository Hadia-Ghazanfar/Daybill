import { ensureInit } from "./_init";
import handler from "./_h/dashboard";
export default async (req: any, res: any) => {
  await ensureInit();
  return handler(req, res);
};
