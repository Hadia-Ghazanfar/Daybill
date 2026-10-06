import { ensureInit } from "./_init";
import handler from "./_h/feedback";
export default async (req: any, res: any) => {
  await ensureInit();
  return handler(req, res);
};
