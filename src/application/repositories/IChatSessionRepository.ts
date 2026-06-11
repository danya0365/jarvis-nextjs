/**
 * IChatSessionRepository
 * Repository interface for ChatSession data access
 * Following Clean Architecture - this is in the Application layer
 */

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  /** ชื่อ session — default "แชทใหม่" แล้ว auto-title จาก user message แรก */
  title: string;
  /** WaveSpeed model ID เช่น "minimax/minimax-m2.7" — เก็บแยกต่อ session */
  model: string;
  messages: ChatMessage[];
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
