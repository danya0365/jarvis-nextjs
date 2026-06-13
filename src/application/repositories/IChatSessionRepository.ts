/**
 * IChatSessionRepository
 * Repository interface for ChatSession data access
 * Following Clean Architecture - this is in the Application layer
 */

export type ChatRole = "user" | "assistant" | "system";

export interface MessageTokenUsage {
  promptTokens: number;
  completionTokens: number;
  /** true = ค่าประมาณฝั่ง client (upstream ไม่ส่ง usage มา เช่น กดหยุดกลาง stream) */
  estimated: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** token usage ของเทิร์นนี้ — เก็บเฉพาะบน assistant message (optional เพื่อ backward-compat กับข้อมูลเก่า) */
  usage?: MessageTokenUsage;
}

export interface ChatSession {
  id: string;
  /** ชื่อ session — default "แชทใหม่" แล้ว auto-title จาก user message แรก */
  title: string;
  /** WaveSpeed model ID เช่น "minimax/minimax-m2.7" — เก็บแยกต่อ session */
  model: string;
  messages: ChatMessage[];
  /** บันทึกความจำ rolling — สรุปข้อความเก่าที่พับแล้ว ส่งเป็น system message หัวบทสนทนา (optional, backward-compat) */
  memory?: string;
  /** จำนวนข้อความเก่าสุดที่ถูกพับเข้า memory แล้ว (index boundary) — undefined = ยังไม่เคยพับ */
  memoryUpToCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatSessionData {
  title?: string;
  model?: string;
}

export interface UpdateChatSessionData {
  title?: string;
  model?: string;
  /** แทนที่ messages ทั้ง array (ครอบทั้ง append และแก้ไข) */
  messages?: ChatMessage[];
  /** บันทึกความจำ rolling ของ session */
  memory?: string;
  /** จำนวนข้อความที่พับเข้า memory แล้ว */
  memoryUpToCount?: number;
}

export interface IChatSessionRepository {
  /**
   * Get all sessions, sorted by updatedAt (newest first)
   */
  getAll(): Promise<ChatSession[]>;

  /**
   * Get session by ID
   */
  getById(id: string): Promise<ChatSession | null>;

  /**
   * Create a new session
   */
  create(data: CreateChatSessionData): Promise<ChatSession>;

  /**
   * Update an existing session (rename / change model / replace messages)
   */
  update(id: string, data: UpdateChatSessionData): Promise<ChatSession>;

  /**
   * Delete a session
   */
  delete(id: string): Promise<boolean>;
}
