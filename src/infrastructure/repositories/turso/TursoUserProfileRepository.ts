/**
 * TursoUserProfileRepository
 * Implementation of IUserProfileRepository using Turso (libsql SQLite)
 * singleton (แถวเดียว id = 'singleton') — มิเรอร์ TursoChatSettingsRepository
 * ⚠️ server-side เท่านั้น
 */

import "server-only";
import {
  IUserProfileRepository,
  UserProfile,
} from "@/src/application/repositories/IUserProfileRepository";
import { getTursoClient, ensureSchema } from "@/src/infrastructure/db/turso";

const SINGLETON_ID = "singleton";

export class TursoUserProfileRepository implements IUserProfileRepository {
  async get(): Promise<UserProfile> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute({
      sql: "SELECT * FROM user_profile WHERE id = ? LIMIT 1",
      args: [SINGLETON_ID],
    });

    if (rows.length === 0) {
      return { profile: "", updatedAt: "" };
    }

    const row = rows[0];
    return {
      profile: String(row.profile ?? ""),
      updatedAt: String(row.updated_at ?? ""),
    };
  }

  async save(profile: string): Promise<UserProfile> {
    await ensureSchema();
    const updatedAt = new Date().toISOString();

    await getTursoClient().execute({
      sql: `INSERT INTO user_profile (id, profile, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              profile = excluded.profile,
              updated_at = excluded.updated_at`,
      args: [SINGLETON_ID, profile, updatedAt],
    });

    return { profile, updatedAt };
  }
}
