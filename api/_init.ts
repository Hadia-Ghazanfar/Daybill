const { migrate } = require("./_schema");
const { seedAdmin } = require("./_seed");

let done = false;
async function ensureInit(): Promise<void> {
  if (done) return;
  await migrate();
  await seedAdmin();
  done = true;
}
module.exports = { ensureInit };
