/**
 * ChatPresenter
 * Handles business logic for Chat management
 * Receives repositories via dependency injection
 */

import { Metadata } from "next";
import {
  IChatSessionRepository,
  ChatSession,
  ChatMessage,
  ChatRole,
  MessageTokenUsage,
  CreateChatSessionData,
} from "@/src/application/repositories/IChatSessionRepository";
import type { IChatSettingsRepository } from "@/src/application/repositories/IChatSettingsRepository";
import type {
  IUsageLedgerRepository,
  UsageLedgerEntry,
} from "@/src/application/repositories/IUsageLedgerRepository";
import {
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  MODEL_GROUPS,
  ModelOption,
  ModelGroup,
  calculateCostUsd,
} from "@/src/application/ai/models";
import {
  estimateTokens,
  estimateMessagesTokens,
} from "@/src/application/ai/tokens";
import type { ChatSettings } from "@/src/application/chat/settings";

export interface UsageTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  /** มี entry ที่เป็นตัวเลขประมาณการปนอยู่ */
  hasEstimated: boolean;
}

export interface ModelUsageSummary extends UsageTotals {
  model: string;
  label: string;
}

export interface UsageSummary {
  allTime: UsageTotals;
  today: UsageTotals;
  byModel: ModelUsageSummary[];
}

export interface SessionUsageTotals {
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  hasEstimated: boolean;
  /** มี message ที่บันทึก usage ไว้อย่างน้อย 1 รายการ */
  hasUsage: boolean;
}

export interface ContextPreview {
  /** จำนวนข้อความที่จะถูกส่งให้ AI (หลัง trim ตาม settings) */
  sendCount: number;
  /** จำนวนข้อความทั้งหมดใน session (รวมข้อความที่กำลังพิมพ์) */
  totalCount: number;
  /** prompt tokens โดยประมาณของสิ่งที่จะส่ง (รวมความจำในโหมด summary) */
  estimatedTokens: number;
  /** true = โหมด summary และมีความจำที่จะแนบไปด้วย */
  hasMemory: boolean;
}

export interface ChatViewModel {
  sessions: ChatSession[];
  models: ModelOption[];
  /** models จัดกลุ่มตามค่าย — ใช้ render <optgroup> ใน dropdown */
  modelGroups: ModelGroup[];
  defaultModel: string;
  settings: ChatSettings;
  usageSummary: UsageSummary;
}

export interface SendMessageParams {
  sessionId: string;
  content: string;
  /** เรียกทุกครั้งที่ได้ token ใหม่ พร้อมข้อความ assistant สะสมทั้งหมด */
  onToken: (fullTextSoFar: string) => void;
  /** แจ้งเฟสปัจจุบัน — "summarizing" = กำลังสรุปความจำก่อนส่ง, "streaming" = กำลังรอคำตอบ */
  onStatus?: (status: "summarizing" | "streaming") => void;
  signal?: AbortSignal;
}

interface SseStreamResult {
  text: string;
  usage: { promptTokens: number; completionTokens: number } | null;
  /** true = ผู้ใช้ยกเลิกกลาง stream (text เป็นคำตอบบางส่วน) */
  aborted: boolean;
}

const MAX_AUTO_TITLE_LENGTH = 40;

/** จำนวนข้อความเก่า (เกิน window) ที่สะสมได้ก่อน auto-fold เป็นความจำ — ยิ่งมากยิ่งสรุปนานๆครั้ง */
const SUMMARY_FOLD_BATCH = 6;

/** เพดานความยาวของบันทึกความจำที่ให้โมเดลสรุป */
const SUMMARY_MAX_TOKENS = 512;

const SUMMARIZE_INSTRUCTION = `คุณคือผู้ช่วยที่ทำหน้าที่ "จดบันทึกความจำ" ของบทสนทนา
หน้าที่: รวมความจำเดิม (ถ้ามี) เข้ากับบทสนทนาใหม่ที่ให้มา แล้วสร้างบันทึกความจำฉบับปรับปรุง
เก็บเฉพาะสิ่งสำคัญที่ควรจำต่อ: ข้อเท็จจริง/ข้อมูลที่ผู้ใช้บอก, การตัดสินใจ, ความชอบหรือข้อกำหนดของผู้ใช้, งาน/คำถามที่ยังค้าง และเหตุการณ์สำคัญ
ตัดสิ่งที่ไม่จำเป็นออก เช่น คำทักทาย คำยืนยันสั้นๆ
ตอบเป็นภาษาเดียวกับบทสนทนา กระชับเป็นข้อๆ ไม่เกินประมาณ 200 คำ
ตอบเฉพาะเนื้อหาบันทึกความจำเท่านั้น ห้ามมีคำนำหรือคำอธิบายอื่น`;

/** ห่อความจำให้เป็น system message หัวบทสนทนา */
function memorySystemContent(memory: string): string {
  return `บันทึกความจำของบทสนทนาก่อนหน้า (สรุปไว้เพื่อความต่อเนื่อง ใช้อ้างอิงได้):\n${memory}`;
}

/**
 * Presenter for Chat management
 * ✅ Receives repositories via constructor injection
 * ✅ Serves as the Single Source of Truth for both UI Views and API Routes
 */
export class ChatPresenter {
  constructor(
    private readonly repository: IChatSessionRepository,
    private readonly settingsRepository: IChatSettingsRepository,
    private readonly usageLedger: IUsageLedgerRepository
  ) {}

  // ============================================================
  // VIEW MODEL METHODS (For Client/Server Components)
  // ============================================================

  /**
   * Get view model for the page
   * ⚠️ Use this ONLY for rendering UI views, NOT for API route responses
   */
  async getViewModel(): Promise<ChatViewModel> {
    try {
      const [sessions, settings, usageSummary] = await Promise.all([
        this.repository.getAll(),
        this.settingsRepository.get(),
        this.getUsageSummary(),
      ]);

      return {
        sessions,
        models: MODEL_OPTIONS,
        modelGroups: MODEL_GROUPS,
        defaultModel: DEFAULT_MODEL,
        settings,
        usageSummary,
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
  // SETTINGS & USAGE
  // ============================================================

  /**
   * Save chat settings (token management)
   */
  async saveSettings(settings: ChatSettings): Promise<ChatSettings> {
    try {
      return await this.settingsRepository.save(settings);
    } catch (error) {
      console.error("Error saving chat settings:", error);
      throw error;
    }
  }

  /**
   * ล้างบัญชีรายจ่าย token สะสมทั้งหมด
   */
  async clearUsageLedger(): Promise<void> {
    try {
      await this.usageLedger.clear();
    } catch (error) {
      console.error("Error clearing usage ledger:", error);
      throw error;
    }
  }

  /**
   * รวมยอดจาก usage ledger: ทั้งหมด / วันนี้ / แยกตาม model
   */
  async getUsageSummary(): Promise<UsageSummary> {
    const entries = await this.usageLedger.getAll();
    const today = localDateString();

    const allTime = sumEntries(entries);
    const todayTotals = sumEntries(
      entries.filter((entry) => entry.date === today)
    );

    const byModelMap = new Map<string, UsageLedgerEntry[]>();
    for (const entry of entries) {
      const group = byModelMap.get(entry.model);
      if (group) {
        group.push(entry);
      } else {
        byModelMap.set(entry.model, [entry]);
      }
    }

    const byModel: ModelUsageSummary[] = [...byModelMap.entries()]
      .map(([model, modelEntries]) => ({
        model,
        label:
          MODEL_OPTIONS.find((option) => option.id === model)?.label ?? model,
        ...sumEntries(modelEntries),
      }))
      .sort((a, b) => b.costUsd - a.costUsd);

    return { allTime, today: todayTotals, byModel };
  }

  /**
   * รวม usage ของ session เดียว (จาก usage ที่เก็บบน assistant messages)
   * pure/sync — hook เรียกใน useMemo ได้
   */
  getSessionUsageTotals(session: ChatSession | null): SessionUsageTotals {
    const totals: SessionUsageTotals = {
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      hasEstimated: false,
      hasUsage: false,
    };
    if (!session) return totals;

    for (const message of session.messages) {
      if (!message.usage) continue;
      totals.hasUsage = true;
      totals.promptTokens += message.usage.promptTokens;
      totals.completionTokens += message.usage.completionTokens;
      totals.hasEstimated = totals.hasEstimated || message.usage.estimated;
      // ใช้ model ปัจจุบันของ session (ไม่ได้เก็บ model ต่อ message — ค่าโดยประมาณ)
      totals.costUsd +=
        calculateCostUsd(
          session.model,
          message.usage.promptTokens,
          message.usage.completionTokens
        ) ?? 0;
    }

    return totals;
  }

  /**
   * Preview ว่าถ้าส่งตอนนี้จะส่งกี่ข้อความ/กี่ token โดยประมาณ
   * pure/sync — hook เรียกใน useMemo ได้
   */
  getContextPreview(
    session: ChatSession | null,
    draft: string,
    settings: ChatSettings
  ): ContextPreview {
    const draftContent = draft.trim();
    const allMessages: Array<{ content: string }> = [
      ...(session?.messages ?? []),
      ...(draftContent ? [{ content: draftContent }] : []),
    ];

    // โหมด summary: ส่งความจำ (system) + ข้อความที่ยังไม่พับ
    if (settings.historyMode === "summary") {
      const start = session?.memoryUpToCount ?? 0;
      const raw = allMessages.slice(start);
      const memory = (session?.memory ?? "").trim();
      const memoryTokens = memory
        ? estimateTokens(memorySystemContent(memory)) + 4
        : 0;

      return {
        sendCount: raw.length,
        totalCount: allMessages.length,
        estimatedTokens: estimateMessagesTokens(raw) + memoryTokens,
        hasMemory: memory.length > 0,
      };
    }

    const contextMessages = trimToContext(allMessages, settings);

    return {
      sendCount: contextMessages.length,
      totalCount: allMessages.length,
      estimatedTokens: estimateMessagesTokens(contextMessages),
      hasMemory: false,
    };
  }

  /**
   * คำนวณค่าใช้จ่าย (USD) ของ usage หนึ่งรายการ — null ถ้าไม่รู้ราคา model
   */
  getMessageCostUsd(model: string, usage: MessageTokenUsage): number | null {
    return calculateCostUsd(model, usage.promptTokens, usage.completionTokens);
  }

  // ============================================================
  // CHAT STREAMING
  // ============================================================

  /**
   * ส่งข้อความหา AI แบบ streaming:
   * 1. persist user message ทันที (กัน refresh ระหว่าง stream)
   * 2. trim history ตาม settings (ประหยัด prompt tokens) แล้วส่งไป /api/chat
   * 3. อ่าน SSE ทีละ token → เรียก onToken + จับ usage จริงจาก chunk สุดท้าย
   * 4. persist assistant message (พร้อม usage) ครั้งเดียวตอนจบ
   *    (รวมกรณี abort — เก็บข้อความบางส่วน + usage ประมาณการ)
   * 5. บันทึกลง usage ledger (ยอดสะสมไม่หายแม้ลบแชต)
   */
  async sendMessage(params: SendMessageParams): Promise<ChatSession> {
    const { sessionId, content, onToken, onStatus, signal } = params;

    const [session, settings] = await Promise.all([
      this.repository.getById(sessionId),
      this.settingsRepository.get(),
    ]);
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

    // 🧠 โหมด summary: ถ้าข้อความเก่า (เกิน window) สะสมถึง batch → พับเป็นความจำก่อนส่ง
    let memory = session.memory;
    let memoryUpToCount = session.memoryUpToCount ?? 0;

    if (settings.historyMode === "summary") {
      const unfolded =
        messagesWithUser.length - settings.maxHistoryMessages - memoryUpToCount;
      if (unfolded >= SUMMARY_FOLD_BATCH) {
        onStatus?.("summarizing");
        const folded = await this.foldMemory(
          sessionId,
          messagesWithUser,
          memory,
          memoryUpToCount,
          settings.maxHistoryMessages,
          settings.summaryModel,
          signal
        );
        if (folded) {
          memory = folded.memory;
          memoryUpToCount = folded.memoryUpToCount;
        }
      }
    }
    onStatus?.("streaming");

    // ✂️ ส่งเฉพาะ context ตาม settings — localStorage ยังเก็บครบทุกข้อความ
    const contextPayload = this.buildSendPayload(
      messagesWithUser,
      settings,
      memory,
      memoryUpToCount
    );

    let result: SseStreamResult = { text: "", usage: null, aborted: false };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextPayload,
          model: session.model,
          maxTokens: settings.maxResponseTokens ?? undefined,
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

      result = await this.readSseStream(response.body, onToken);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // ยกเลิกก่อน stream เริ่ม (เช่น ระหว่างรอ response) — ไม่มีข้อความให้เก็บ
        result.aborted = true;
      } else {
        throw error;
      }
    }

    const assistantText = result.text;

    if (!assistantText && result.aborted) {
      // หยุดก่อนได้ token แรก — ไม่ต้องบันทึก assistant message
      const current = await this.repository.getById(sessionId);
      return current || session;
    }

    // usage จริงจาก API — ถ้าไม่มี (เช่น abort กลางทาง) ใช้ค่าประมาณ
    const usage: MessageTokenUsage = result.usage
      ? { ...result.usage, estimated: false }
      : {
          promptTokens: estimateMessagesTokens(contextPayload),
          completionTokens: estimateTokens(assistantText),
          estimated: true,
        };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantText,
      createdAt: new Date().toISOString(),
      usage,
    };

    const updated = await this.repository.update(sessionId, {
      messages: [...messagesWithUser, assistantMessage],
    });

    // บันทึกบัญชีรายจ่าย — ห้ามทำให้แชตล้มถ้าบันทึกไม่สำเร็จ
    try {
      await this.usageLedger.append({
        date: localDateString(),
        model: session.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        estimated: usage.estimated,
        kind: "chat",
      });
    } catch (error) {
      console.error("Error appending usage ledger entry:", error);
    }

    return updated;
  }

  // ============================================================
  // MEMORY (rolling summary)
  // ============================================================

  /**
   * สรุปความจำทันที (manual fold) — พับข้อความเก่ากว่า window เข้าความจำเดี๋ยวนั้น
   * คืน session ล่าสุด (เปลี่ยนหรือไม่ก็ได้ ถ้าไม่มีอะไรให้พับ/สรุปไม่สำเร็จ)
   */
  async summarizeNow(
    sessionId: string,
    signal?: AbortSignal
  ): Promise<ChatSession> {
    const [session, settings] = await Promise.all([
      this.repository.getById(sessionId),
      this.settingsRepository.get(),
    ]);
    if (!session) {
      throw new Error("ไม่พบ session ที่เลือก");
    }

    await this.foldMemory(
      sessionId,
      session.messages,
      session.memory,
      session.memoryUpToCount ?? 0,
      settings.maxHistoryMessages,
      settings.summaryModel,
      signal
    );

    return (await this.repository.getById(sessionId)) ?? session;
  }

  /**
   * ล้างความจำของ session (reset boundary กลับไปนับใหม่)
   */
  async clearMemory(sessionId: string): Promise<ChatSession> {
    return this.repository.update(sessionId, {
      memory: "",
      memoryUpToCount: 0,
    });
  }

  /**
   * พับข้อความ `[startCount, len-keepRecent)` เข้าความจำ:
   * - เรียก LLM สรุป (รวมความจำเดิม) → persist memory + เลื่อน memoryUpToCount
   * - บันทึก ledger (kind: summary) — ห่อ try/catch แยก
   * - คืน null ถ้าไม่มีอะไรให้พับ หรือสรุปไม่สำเร็จ (ไม่เลื่อน boundary, ไม่ทิ้งข้อความ)
   */
  private async foldMemory(
    sessionId: string,
    messages: ChatMessage[],
    existingMemory: string | undefined,
    startCount: number,
    keepRecent: number,
    summaryModel: string,
    signal?: AbortSignal
  ): Promise<{ memory: string; memoryUpToCount: number } | null> {
    const foldUpTo = messages.length - keepRecent;
    if (foldUpTo <= startCount) return null; // ไม่มีข้อความเก่าเกิน window ให้พับ

    const toFold = messages.slice(startCount, foldUpTo);
    const summary = await this.requestSummary(
      existingMemory ?? "",
      toFold,
      summaryModel,
      signal
    );
    if (!summary) return null;

    await this.repository.update(sessionId, {
      memory: summary.memory,
      memoryUpToCount: foldUpTo,
    });

    if (summary.usage) {
      try {
        await this.usageLedger.append({
          date: localDateString(),
          model: summaryModel,
          promptTokens: summary.usage.promptTokens,
          completionTokens: summary.usage.completionTokens,
          estimated: false,
          kind: "summary",
        });
      } catch (error) {
        console.error("Error appending summary usage ledger entry:", error);
      }
    }

    return { memory: summary.memory, memoryUpToCount: foldUpTo };
  }

  /**
   * เรียก LLM (โมเดลถูกๆ) สรุปบทสนทนา → คืน { memory, usage }
   * ใช้ /api/chat เดิม (สตรีม) แล้ว drain ทั้งหมด — ห่อ try/catch, คืน null ถ้าล้มเหลว
   */
  private async requestSummary(
    existingMemory: string,
    messagesToFold: ChatMessage[],
    summaryModel: string,
    signal?: AbortSignal
  ): Promise<{ memory: string; usage: SseStreamResult["usage"] } | null> {
    if (messagesToFold.length === 0) return null;

    try {
      const transcript = messagesToFold
        .map((message) => `${roleLabel(message.role)}: ${message.content}`)
        .join("\n\n");

      const userPayload = [
        existingMemory.trim()
          ? `ความจำเดิม:\n${existingMemory.trim()}`
          : "ยังไม่มีความจำเดิม",
        `บทสนทนาที่ต้องรวมเข้าความจำ:\n${transcript}`,
      ].join("\n\n");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SUMMARIZE_INSTRUCTION },
            { role: "user", content: userPayload },
          ],
          model: summaryModel,
          maxTokens: SUMMARY_MAX_TOKENS,
        }),
        signal,
      });

      if (!response.ok || !response.body) return null;

      const result = await this.readSseStream(response.body, () => {});
      const memory = result.text.trim();
      if (!memory) return null;

      return { memory, usage: result.usage };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // ยกเลิกระหว่างสรุป — ไม่อัปเดตความจำ ไม่ทำให้แชตล้ม
        return null;
      }
      console.error("Error summarizing conversation memory:", error);
      return null;
    }
  }

  /**
   * สร้าง payload ที่จะส่งให้ AI ตาม settings:
   * - summary: system(memory) (ถ้ามี) + ข้อความตั้งแต่ memoryUpToCount เป็นต้นไป
   * - recent/all: trim ตามจำนวนข้อความ (พฤติกรรมเดิม)
   */
  private buildSendPayload(
    messages: ChatMessage[],
    settings: ChatSettings,
    memory: string | undefined,
    memoryUpToCount: number
  ): Array<{ role: ChatRole; content: string }> {
    if (settings.historyMode === "summary") {
      const raw = messages
        .slice(memoryUpToCount)
        .map((message) => ({ role: message.role, content: message.content }));

      const trimmedMemory = (memory ?? "").trim();
      if (trimmedMemory) {
        return [
          { role: "system", content: memorySystemContent(trimmedMemory) },
          ...raw,
        ];
      }
      return raw;
    }

    return trimToContext(messages, settings).map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  /**
   * อ่าน SSE stream (OpenAI-compatible) → คืนข้อความ assistant + usage จริง
   * - TextDecoder แบบ stream:true กันตัวอักษรไทย (multi-byte) ขาดกลาง chunk
   * - buffer เศษ event ที่ขาดกลางบรรทัดข้าม chunk
   * - usage มากับ chunk สุดท้ายก่อน [DONE] (choices ว่าง) เพราะส่ง stream_options.include_usage
   * - AbortError ระหว่างอ่าน → ไม่ throw แต่คืนข้อความบางส่วน + aborted: true
   */
  private async readSseStream(
    body: ReadableStream<Uint8Array>,
    onToken: (fullTextSoFar: string) => void
  ): Promise<SseStreamResult> {
    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullText = "";
    let usage: SseStreamResult["usage"] = null;

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
              return { text: fullText, usage, aborted: false };
            }

            try {
              const parsed = JSON.parse(payload);

              const delta: string = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                fullText += delta;
                onToken(fullText);
              }

              if (parsed.usage) {
                usage = {
                  promptTokens: Number(parsed.usage.prompt_tokens) || 0,
                  completionTokens:
                    Number(parsed.usage.completion_tokens) || 0,
                };
              }
            } catch {
              // ข้าม payload ที่ parse ไม่ได้ (เช่น comment/keep-alive)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // ผู้ใช้กดหยุดกลาง stream — เก็บข้อความเท่าที่ได้รับ
        return { text: fullText, usage, aborted: true };
      }
      throw error;
    } finally {
      reader.releaseLock();
    }

    return { text: fullText, usage, aborted: false };
  }

  private buildAutoTitle(content: string): string {
    const trimmed = content.trim().replace(/\s+/g, " ");
    if (trimmed.length <= MAX_AUTO_TITLE_LENGTH) {
      return trimmed || "แชทใหม่";
    }
    return `${trimmed.slice(0, MAX_AUTO_TITLE_LENGTH)}…`;
  }
}

// ============================================================
// Pure helpers
// ============================================================

/**
 * ตัด history ให้เหลือ context window ตาม settings
 * generic เพื่อใช้ได้ทั้ง ChatMessage จริงและ draft preview
 */
function trimToContext<T extends { content: string }>(
  messages: T[],
  settings: ChatSettings
): T[] {
  if (settings.historyMode === "all") return messages;
  return messages.slice(-Math.max(1, settings.maxHistoryMessages));
}

function sumEntries(entries: UsageLedgerEntry[]): UsageTotals {
  const totals: UsageTotals = {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    hasEstimated: false,
  };

  for (const entry of entries) {
    totals.calls += 1;
    totals.promptTokens += entry.promptTokens;
    totals.completionTokens += entry.completionTokens;
    totals.hasEstimated = totals.hasEstimated || entry.estimated;
    totals.costUsd +=
      calculateCostUsd(entry.model, entry.promptTokens, entry.completionTokens) ??
      0;
  }

  return totals;
}

/** ป้ายชื่อบทบาทสำหรับ transcript ที่ส่งให้โมเดลสรุป */
function roleLabel(role: ChatRole): string {
  if (role === "user") return "ผู้ใช้";
  if (role === "assistant") return "ผู้ช่วย";
  return "ระบบ";
}

/** วันที่แบบ local "YYYY-MM-DD" */
function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
