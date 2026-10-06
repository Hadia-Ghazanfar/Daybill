import { migrate } from "./_schema";
import { seedAdmin } from "./_seed";

let done = false;
export async function ensureInit(): Promise<void> {
  if (done) return;
  await migrate();
  await seedAdmin();
  done = true;
}
