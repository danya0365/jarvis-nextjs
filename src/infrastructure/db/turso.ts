/**
 * Turso (libsql SQLite) client + schema bootstrap
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ server-side เท่านั้น — มี auth token เป็นความลับ ห้าม import ฝั่ง client
 */

import "server-only";
import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

/**
 * libsql client แบบ singleton — สร้างครั้งเดียวต่อ process
 * โยน error ถ้า env ไม่ครบ (เทียบ createWaveSpeedClient ที่คืน null เมื่อไม่มี key)
 */
export function getTursoClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า TURSO_DATABASE_URL / TURSO_AUTH_TOKEN ในไฟล์ .env.local"
    );
  }

  client = createClient({ url, authToken });
  return client;
}

let schemaReady: Promise<void> | null = null;

/**
 * สร้าง table/index ครั้งแรกที่ใช้งาน (idempotent) — guard ด้วย promise ให้รันครั้งเดียว
 * ทุก repo เรียก await ensureSchema() ก่อน query
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = bootstrap().catch((error) => {
      // ถ้าล้ม ให้ลองใหม่รอบหน้า (อย่า cache ตัว reject ค้างไว้)
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function bootstrap(): Promise<void> {
  const db = getTursoClient();
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        model TEXT NOT NULL,
        messages TEXT NOT NULL DEFAULT '[]',
        memory TEXT,
        memory_up_to_count INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
        ON chat_sessions(updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS chat_settings (
        id TEXT PRIMARY KEY,
        history_mode TEXT NOT NULL,
        max_history_messages INTEGER NOT NULL,
        max_response_tokens INTEGER,
        summary_model TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS usage_ledger (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        estimated INTEGER NOT NULL,
        kind TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_ledger(date)`,
    ],
    "write"
  );
}
