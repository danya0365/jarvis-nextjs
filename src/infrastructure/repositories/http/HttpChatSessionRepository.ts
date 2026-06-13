/**
 * HttpChatSessionRepository
 * Implementation of IChatSessionRepository ที่คุยกับ Turso ผ่าน /api/sessions
 * Following Clean Architecture - this is in the Infrastructure layer (client adapter)
 * - read: ถ้าล้ม → คืน [] / null (graceful fallback ไม่ให้ UI crash ตอน DB ล่ม)
 * - write: โยน error ถ้า response ไม่ ok (ให้ hook เดิมจัดการ)
 */

import {
  IChatSessionRepository,
  ChatSession,
  CreateChatSessionData,
  UpdateChatSessionData,
} from "@/src/application/repositories/IChatSessionRepository";

const BASE = "/api/sessions";

export class HttpChatSessionRepository implements IChatSessionRepository {
  async getAll(): Promise<ChatSession[]> {
    try {
      const res = await fetch(BASE, { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as ChatSession[]) : [];
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<ChatSession | null> {
    try {
      const res = await fetch(`${BASE}/${id}`, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as ChatSession;
    } catch {
      return null;
    }
  }

  async create(data: CreateChatSessionData): Promise<ChatSession> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("สร้างแชทใหม่ไม่สำเร็จ");
    return (await res.json()) as ChatSession;
  }

  async update(id: string, data: UpdateChatSessionData): Promise<ChatSession> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("บันทึกแชทไม่สำเร็จ");
    return (await res.json()) as ChatSession;
  }

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("ลบแชทไม่สำเร็จ");
    const data = (await res.json()) as { deleted?: boolean };
    return Boolean(data.deleted);
  }
}
