const { migrate } = require("./_schema");
const { seedAdmin } = require("./_seed");

let done = false;
async function ensureInit(): Promise<void> {
  if (done) return;
  await migrate();
  await seedAdmin();
  // Add logo_url column if missing (for existing DBs)
  try {
    const { run, isPg } = require("./_db");
    if (isPg()) {
      await run("ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url TEXT");
    } else {
      try { await run("ALTER TABLE users ADD COLUMN logo_url TEXT"); } catch (e: any) {
        if (!String(e.message).includes("duplicate column")) throw e;
      }
    }
  } catch (e) {
    console.log("logo_url migration:", String(e).slice(0, 100));
  }
  done = true;
}
module.exports = { ensureInit };
