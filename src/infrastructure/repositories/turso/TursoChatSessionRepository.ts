/**
 * TursoChatSessionRepository
 * Implementation of IChatSessionRepository using Turso (libsql SQLite)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ server-side เท่านั้น — ใช้ผ่าน API route handlers (ดู app/api/sessions)
 */

import "server-only";
import type { Row } from "@libsql/client";
import {
  IChatSessionRepository,
  ChatSession,
  ChatMessage,
  CreateChatSessionData,
  UpdateChatSessionData,
} from "@/src/application/repositories/IChatSessionRepository";
import {
  DEFAULT_PROVIDER,
  getProvider,
  resolveModelForProvider,
  type ProviderId,
} from "@/src/application/ai/providers";
import { getTursoClient, ensureSchema } from "@/src/infrastructure/db/turso";

export class TursoChatSessionRepository implements IChatSessionRepository {
  async getAll(): Promise<ChatSession[]> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute(
      "SELECT * FROM chat_sessions ORDER BY updated_at DESC"
    );
    return rows.map(rowToSession);
  }

  async getById(id: string): Promise<ChatSession | null> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute({
      sql: "SELECT * FROM chat_sessions WHERE id = ? LIMIT 1",
      args: [id],
    });
    return rows.length > 0 ? rowToSession(rows[0]) : null;
  }

  async create(data: CreateChatSessionData): Promise<ChatSession> {
    await ensureSchema();
    const now = new Date().toISOString();
    // model ต้องอยู่ใน provider เดียวกันเสมอ — ไม่งั้น upstream จะตอบ 404
    const provider = (data.provider || DEFAULT_PROVIDER) as ProviderId;
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: data.title || "แชทใหม่",
      provider,
      model: resolveModelForProvider(data.model, provider),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    await getTursoClient().execute({
      sql: `INSERT INTO chat_sessions
              (id, title, provider, model, messages, memory, memory_up_to_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      args: [
        session.id,
        session.title,
        session.provider,
        session.model,
        JSON.stringify(session.messages),
        session.createdAt,
        session.updatedAt,
      ],
    });

    return session;
  }

  async update(id: string, data: UpdateChatSessionData): Promise<ChatSession> {
    await ensureSchema();

    // เปลี่ยน provider/model ต้องอยู่ในคู่ที่ provider รองรับ — resolve ก่อนเขียนลง DB
    if (data.provider !== undefined || data.model !== undefined) {
      const current = await this.getById(id);
      if (!current) {
        throw new Error("ไม่พบ session ที่ต้องการแก้ไข");
      }
      const providerId = (data.provider ?? current.provider) as ProviderId;
      data = { ...data, model: resolveModelForProvider(data.model ?? current.model, providerId) };
    }

    // build SET เฉพาะ field ที่ส่งมา + updated_at เสมอ
    const sets: string[] = [];
    const args: (string | number | null)[] = [];

    if (data.title !== undefined) {
      sets.push("title = ?");
      args.push(data.title);
    }
    if (data.provider !== undefined) {
      sets.push("provider = ?");
      args.push(data.provider);
    }
    if (data.model !== undefined) {
      sets.push("model = ?");
      args.push(data.model);
    }
    if (data.messages !== undefined) {
      sets.push("messages = ?");
      args.push(JSON.stringify(data.messages));
    }
    if (data.memory !== undefined) {
      sets.push("memory = ?");
      args.push(data.memory);
    }
    if (data.memoryUpToCount !== undefined) {
      sets.push("memory_up_to_count = ?");
      args.push(data.memoryUpToCount);
    }

    const updatedAt = new Date().toISOString();
    sets.push("updated_at = ?");
    args.push(updatedAt);

    args.push(id);

    const result = await getTursoClient().execute({
      sql: `UPDATE chat_sessions SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });

    if (result.rowsAffected === 0) {
      throw new Error("ไม่พบ session ที่ต้องการแก้ไข");
    }

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error("ไม่พบ session ที่ต้องการแก้ไข");
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await ensureSchema();
    const result = await getTursoClient().execute({
      sql: "DELETE FROM chat_sessions WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }
}

/** map แถว SQL (snake_case) → ChatSession entity (camelCase) */
function rowToSession(row: Row): ChatSession {
  const memoryUpToCount = row.memory_up_to_count;
  // session เก่าอาจคู่ provider/model ไม่ตรงกัน (เช่น provider เปลี่ยนแต่ model ยังเป็นตัวเดิม)
  // → resolve ให้เป็น model ที่ provider รองรับจริง ตอนอ่าน ไม่ต้องรอ migration
  const providerId = String(row.provider) as ProviderId;
  return {
    id: String(row.id),
    title: String(row.title),
    provider: getProvider(providerId).id,
    model: resolveModelForProvider(String(row.model), providerId),
    messages: parseMessages(row.messages),
    memory: row.memory === null ? undefined : String(row.memory),
    memoryUpToCount:
      memoryUpToCount === null ? undefined : Number(memoryUpToCount),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseMessages(raw: unknown): ChatMessage[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}
