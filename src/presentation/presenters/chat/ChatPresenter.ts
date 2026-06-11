/**
 * ChatPresenter
 * Handles business logic for Chat management
 * Receives repository via dependency injection
 */

import { Metadata } from "next";
import {
  IChatSessionRepository,
  ChatSession,
  ChatMessage,
  CreateChatSessionData,
} from "@/src/application/repositories/IChatSessionRepository";
import {
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  ModelOption,
} from "@/src/application/ai/models";

export interface ChatViewModel {
  sessions: ChatSession[];
  models: ModelOption[];
  defaultModel: string;
}

export interface SendMessageParams {
  sessionId: string;
  content: string;
  /** เรียกทุกครั้งที่ได้ token ใหม่ พร้อมข้อความ assistant สะสมทั้งหมด */
  onToken: (fullTextSoFar: string) => void;
  signal?: AbortSignal;
}

const MAX_AUTO_TITLE_LENGTH = 40;

/**
 * Presenter for Chat management
 * ✅ Receives repository via constructor injection
 * ✅ Serves as the Single Source of Truth for both UI Views and API Routes
 */
export class ChatPresenter {
  constructor(private readonly repository: IChatSessionRepository) {}

  // ============================================================
  // VIEW MODEL METHODS (For Client/Server Components)
  // ============================================================

  /**
   * Get view model for the page
   * ⚠️ Use this ONLY for rendering UI views, NOT for API route responses
   */
  async getViewModel(): Promise<ChatViewModel> {
    try {
      const sessions = await this.repository.getAll();

      return {
        sessions,
        models: MODEL_OPTIONS,
        defaultModel: DEFAULT_MODEL,
      };
    } catch (error) {
      console.error("Error getting view model:", error);
      throw error;
    }
  }

  /**
   * Generate metadata for the page
   */
  generateMetadata(): Metadata {
    return {
      title: "แชท AI | Jarvis",
      description: "ระบบแชท AI คุยต่อเนื่องหลาย session ผ่าน WaveSpeed LLM",
    };
  }

  // ============================================================
  // GRANULAR DATA METHODS
  // ============================================================

  /**
   * Create a new chat session
   */
  async createSession(data: CreateChatSessionData = {}): Promise<ChatSession> {
    try {
      return await this.repository.create(data);
    } catch (error) {
      console.error("Error creating chat session:", error);
      throw error;
    }
  }

  /**
   * Rename a session
   */
  async renameSession(id: string, title: string): Promise<ChatSession> {
    try {
      return await this.repository.update(id, { title });
    } catch (error) {
      console.error("Error renaming chat session:", error);
      throw error;
    }
  }

  /**
   * Change the model used by a session
   */
  async setSessionModel(id: string, model: string): Promise<ChatSession> {
    try {
      return await this.repository.update(id, { model });
    } catch (error) {
      console.error("Error setting session model:", error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      return await this.repository.delete(id);
    } catch (error) {
      console.error("Error deleting chat session:", error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<ChatSession | null> {
    try {
      return await this.repository.getById(id);
    } catch (error) {
      console.error("Error getting chat session:", error);
      throw error;
    }
  }

  // ============================================================
  // CHAT STREAMING
  // ============================================================

  /**
   * ส่งข้อความหา AI แบบ streaming:
   * 1. persist user message ทันที (กัน refresh ระหว่าง stream)
   * 2. ส่ง history ทั้งหมดไป /api/chat (proxy → WaveSpeed)
   * 3. อ่าน SSE ทีละ token → เรียก onToken
   * 4. persist assistant message ครั้งเดียวตอนจบ (รวมกรณี abort — เก็บข้อความบางส่วน)
   */
  async sendMessage(params: SendMessageParams): Promise<ChatSession> {
    const { sessionId, content, onToken, signal } = params;

    const session = await this.repository.getById(sessionId);
    if (!session) {
      throw new Error("ไม่พบ session ที่เลือก");
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const messagesWithUser = [...session.messages, userMessage];

    // auto-title จาก user message แรก
    const isFirstUserMessage = !session.messages.some(
      (message) => message.role === "user"
    );
    const title = isFirstUserMessage
      ? this.buildAutoTitle(content)
      : session.title;

    await this.repository.update(sessionId, {
      messages: messagesWithUser,
      title,
    });

    let assistantText = "";
    let aborted = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesWithUser.map(({ role, content }) => ({
            role,
            content,
          })),
          model: session.model,
        }),
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อ AI"
        );
      }

      if (!response.body) {
        throw new Error("ไม่ได้รับข้อมูลตอบกลับจาก AI");
      }

      assistantText = await this.readSseStream(response.body, onToken);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // ผู้ใช้กดหยุด — เก็บข้อความเท่าที่ได้รับ
        aborted = true;
      } else {
        throw error;
      }
    }

    if (!assistantText && aborted) {
      // หยุดก่อนได้ token แรก — ไม่ต้องบันทึก assistant message
      const current = await this.repository.getById(sessionId);
      return current || session;
    }

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantText,
      createdAt: new Date().toISOString(),
    };

    return this.repository.update(sessionId, {
      messages: [...messagesWithUser, assistantMessage],
    });
  }

  /**
   * อ่าน SSE stream (OpenAI-compatible) → คืนข้อความ assistant ทั้งหมด
   * ใช้ TextDecoder แบบ stream:true กันตัวอักษรไทย (multi-byte) ขาดกลาง chunk
   * และ buffer เศษ event ที่ขาดกลางบรรทัดข้าม chunk
   */
  private async readSseStream(
    body: ReadableStream<Uint8Array>,
    onToken: (fullTextSoFar: string) => void
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullText = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events คั่นด้วยบรรทัดว่าง — เก็บส่วนท้ายที่ยังไม่ครบไว้ใน buffer
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          for (const line of event.split("\n")) {
            if (!line.startsWith("data:")) continue;

            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              return fullText;
            }

            try {
              const parsed = JSON.parse(payload);
              const delta: string = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                fullText += delta;
                onToken(fullText);
              }
            } catch {
              // ข้าม payload ที่ parse ไม่ได้ (เช่น comment/keep-alive)
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }

  private buildAutoTitle(content: string): string {
    const trimmed = content.trim().replace(/\s+/g, " ");
    if (trimmed.length <= MAX_AUTO_TITLE_LENGTH) {
      return trimmed || "แชทใหม่";
    }
    return `${trimmed.slice(0, MAX_AUTO_TITLE_LENGTH)}…`;
  }
}
