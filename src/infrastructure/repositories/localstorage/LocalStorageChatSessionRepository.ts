/**
 * LocalStorageChatSessionRepository
 * Implementation of IChatSessionRepository using browser localStorage
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ ใช้ได้เฉพาะฝั่ง client เท่านั้น — ห้าม import ใน server factory
 */

import {
  IChatSessionRepository,
  ChatSession,
  CreateChatSessionData,
  UpdateChatSessionData,
} from "@/src/application/repositories/IChatSessionRepository";
import {
  DEFAULT_PROVIDER,
  resolveModelForProvider,
  type ProviderId,
} from "@/src/application/ai/providers";

const STORAGE_KEY = "jarvis.chat.sessions";

export class LocalStorageChatSessionRepository
  implements IChatSessionRepository
{
  async getAll(): Promise<ChatSession[]> {
    return this.load().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getById(id: string): Promise<ChatSession | null> {
    return this.load().find((session) => session.id === id) || null;
  }

  async create(data: CreateChatSessionData): Promise<ChatSession> {
    const sessions = this.load();
    const now = new Date().toISOString();
    // model ต้องอยู่ใน provider เดียวกันเสมอ — ไม่งั้น upstream จะตอบ 404
    const provider = (data.provider || DEFAULT_PROVIDER) as ProviderId;

    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: data.title || "แชทใหม่",
      provider,
      model: resolveModelForProvider(data.model, provider),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    sessions.unshift(newSession);
    this.save(sessions);
    return newSession;
  }

  async update(id: string, data: UpdateChatSessionData): Promise<ChatSession> {
    const sessions = this.load();
    const index = sessions.findIndex((session) => session.id === id);
    if (index === -1) {
      throw new Error("ไม่พบ session ที่ต้องการแก้ไข");
    }

    const updatedSession: ChatSession = {
      ...sessions[index],
      ...data,
      // เปลี่ยน provider แล้ว model เดิมอาจไม่รองรับ → ต้อง resolve ใหม่
      model: resolveModelForProvider(
        data.model ?? sessions[index].model,
        (data.provider ?? sessions[index].provider) as ProviderId
      ),
      updatedAt: new Date().toISOString(),
    };

    sessions[index] = updatedSession;
    this.save(sessions);
    return updatedSession;
  }

  async delete(id: string): Promise<boolean> {
    const sessions = this.load();
    const index = sessions.findIndex((session) => session.id === id);
    if (index === -1) {
      return false;
    }

    sessions.splice(index, 1);
    this.save(sessions);
    return true;
  }

  private load(): ChatSession[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ChatSession[]) : [];
    } catch {
      // ข้อมูลเสียหรืออ่าน localStorage ไม่ได้ — เริ่มใหม่จาก list ว่าง
      return [];
    }
  }

  private save(sessions: ChatSession[]): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Error saving chat sessions to localStorage:", error);
    }
  }
}
