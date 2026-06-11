/**
 * MockChatSessionRepository
 * Mock implementation for development and testing
 * Following Clean Architecture - this is in the Infrastructure layer
 */

import {
  IChatSessionRepository,
  ChatSession,
  CreateChatSessionData,
  UpdateChatSessionData,
} from "@/src/application/repositories/IChatSessionRepository";
import { DEFAULT_MODEL } from "@/src/application/ai/models";

// Mock data for development
const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: "session-001",
    title: "ถามเรื่อง Next.js",
    model: DEFAULT_MODEL,
    messages: [
      {
        id: "msg-001",
        role: "user",
        content: "Next.js คืออะไร?",
        createdAt: "2026-06-10T10:30:00.000Z",
      },
      {
        id: "msg-002",
        role: "assistant",
        content:
          "Next.js คือ React framework สำหรับสร้างเว็บแอปพลิเคชัน รองรับทั้ง Server-Side Rendering และ Static Site Generation ครับ",
        createdAt: "2026-06-10T10:30:05.000Z",
      },
    ],
    createdAt: "2026-06-10T10:30:00.000Z",
    updatedAt: "2026-06-10T10:30:05.000Z",
  },
  {
    id: "session-002",
    title: "แชทใหม่",
    model: DEFAULT_MODEL,
    messages: [],
    createdAt: "2026-06-09T09:00:00.000Z",
    updatedAt: "2026-06-09T09:00:00.000Z",
  },
];

export class MockChatSessionRepository implements IChatSessionRepository {
  private sessions: ChatSession[];

  /**
   * @param seed true = ใส่ข้อมูลตัวอย่าง (สำหรับ dev UI),
   *             false = ว่างเปล่า (server factory ใช้แบบนี้ เพราะข้อมูลจริงอยู่ localStorage ฝั่ง client)
   */
  constructor(seed: boolean = true) {
    this.sessions = seed ? structuredClone(MOCK_CHAT_SESSIONS) : [];
  }

  async getAll(): Promise<ChatSession[]> {
    await this.delay(100);
    return [...this.sessions].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  async getById(id: string): Promise<ChatSession | null> {
    await this.delay(100);
    return this.sessions.find((session) => session.id === id) || null;
  }

  async create(data: CreateChatSessionData): Promise<ChatSession> {
    await this.delay(100);

    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: data.title || "แชทใหม่",
      model: data.model || DEFAULT_MODEL,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.unshift(newSession);
    return newSession;
  }

  async update(id: string, data: UpdateChatSessionData): Promise<ChatSession> {
    await this.delay(100);

    const index = this.sessions.findIndex((session) => session.id === id);
    if (index === -1) {
      throw new Error("ChatSession not found");
    }

    const updatedSession: ChatSession = {
      ...this.sessions[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.sessions[index] = updatedSession;
    return updatedSession;
  }

  async delete(id: string): Promise<boolean> {
    await this.delay(100);

    const index = this.sessions.findIndex((session) => session.id === id);
    if (index === -1) {
      return false;
    }

    this.sessions.splice(index, 1);
    return true;
  }

  // Helper method to simulate network delay
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
