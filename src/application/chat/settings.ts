/**
 * ChatSettings
 * การตั้งค่าการบริหาร token/ค่าใช้จ่าย — ใช้ร่วมกันทุก session
 * Following Clean Architecture - this is in the Application layer
 */

import {
  DEFAULT_SUMMARY_MODEL,
  isKnownModel,
} from "@/src/application/ai/models";

export type HistoryMode = "all" | "recent" | "summary";

export interface ChatSettings {
  /**
   * "summary" = สรุปข้อความเก่าเป็นความจำ + ส่งข้อความล่าสุด (ประหยัด token แต่ยังจำเรื่องสำคัญ),
   * "recent" = ส่งเฉพาะข้อความล่าสุด (ตัดเก่าทิ้ง), "all" = ส่งทั้งหมด
   */
  historyMode: HistoryMode;
  /** จำนวนข้อความล่าสุดที่ส่งดิบให้ AI เมื่อ historyMode = "recent"/"summary" */
  maxHistoryMessages: number;
  /** จำกัดความยาวคำตอบ (max_tokens) — null = ไม่จำกัด */
  maxResponseTokens: number | null;
  /** model ID ที่ใช้สรุปความจำเมื่อ historyMode = "summary" (ควรเป็นโมเดลถูกๆ) */
  summaryModel: string;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  historyMode: "summary",
  maxHistoryMessages: 10,
  maxResponseTokens: 1024,
  summaryModel: DEFAULT_SUMMARY_MODEL,
};

export const MIN_HISTORY_MESSAGES = 1;
export const MAX_HISTORY_MESSAGES = 100;
export const MIN_RESPONSE_TOKENS = 16;
export const MAX_RESPONSE_TOKENS = 32768;

/**
 * Sanitize ค่าที่อ่านจาก storage/ผู้ใช้กรอก — กันค่าเพี้ยน (NaN, ติดลบ, เกินขอบ)
 */
export function normalizeChatSettings(
  value: Partial<ChatSettings> | null | undefined
): ChatSettings {
  const defaults = DEFAULT_CHAT_SETTINGS;
  if (!value || typeof value !== "object") return { ...defaults };

  const historyMode: HistoryMode =
    value.historyMode === "all" ||
    value.historyMode === "recent" ||
    value.historyMode === "summary"
      ? value.historyMode
      : defaults.historyMode;

  const maxHistoryMessages = clampInt(
    value.maxHistoryMessages,
    MIN_HISTORY_MESSAGES,
    MAX_HISTORY_MESSAGES,
    defaults.maxHistoryMessages
  );

  const maxResponseTokens =
    value.maxResponseTokens === null
      ? null
      : clampInt(
          value.maxResponseTokens,
          MIN_RESPONSE_TOKENS,
          MAX_RESPONSE_TOKENS,
          defaults.maxResponseTokens ?? 1024
        );

  const summaryModel =
    typeof value.summaryModel === "string" && isKnownModel(value.summaryModel)
      ? value.summaryModel
      : defaults.summaryModel;

  return { historyMode, maxHistoryMessages, maxResponseTokens, summaryModel };
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
