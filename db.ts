import fs from "fs";
import path from "path";

// Translate `?` placeholders to `$1,$2,...` for postgres.
export function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const usePg = !!process.env.DATABASE_URL;

let pool: any = null;
let sqlite: any = null;

if (usePg) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  // Anchor the sqlite file at the project root (api/_lib -> root), independent of cwd.
  const projectRoot = path.resolve(__dirname, "..", "..");
  const dbPath = process.env.SQLITE_PATH || path.join(projectRoot, "data", "daybill.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sqlite = require("better-sqlite3")(dbPath);
}

/** Run a SELECT returning all rows. */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (usePg) {
    const res = await pool.query(toPgPlaceholders(sql), params);
    return res.rows as T[];
  }
  return sqlite.prepare(sql).all(...params) as T[];
}

/** Run a SELECT returning the first row (or undefined). */
export async function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  if (usePg) {
    const res = await pool.query(toPgPlaceholders(sql), params);
    return res.rows[0] as T | undefined;
  }
  return sqlite.prepare(sql).get(...params) as T | undefined;
}

/** Run INSERT/UPDATE/DELETE. Returns { lastID, changes }. */
export async function run(sql: string, params: any[] = []): Promise<{ lastID: any; changes: number }> {
  if (usePg) {
    // For INSERTs on users etc. we always return id via RETURNING id when needed.
    const needsReturning = /^\s*insert\s/i.test(sql);
    const finalSql = needsReturning && !/returning\s/i.test(sql)
      ? toPgPlaceholders(sql) + " RETURNING id"
      : toPgPlaceholders(sql);
    const res = await pool.query(finalSql, params);
    return {
      lastID: res.rows && res.rows[0] ? res.rows[0].id : undefined,
      changes: typeof res.rowCount === "number" ? res.rowCount : 0,
    };
  }
  const info = sqlite.prepare(sql).run(...params);
  return { lastID: info.lastInsertRowid, changes: Number(info.changes) };
}

export function isPg(): boolean {
  return usePg;
}
