/**
 * LocalStorageChatSettingsRepository
 * Implementation of IChatSettingsRepository using browser localStorage
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ ใช้ได้เฉพาะฝั่ง client เท่านั้น — ห้าม import ใน server factory
 */

import type { IChatSettingsRepository } from "@/src/application/repositories/IChatSettingsRepository";
import {
  ChatSettings,
  DEFAULT_CHAT_SETTINGS,
  normalizeChatSettings,
} from "@/src/application/chat/settings";

const STORAGE_KEY = "jarvis.chat.settings";

export class LocalStorageChatSettingsRepository
  implements IChatSettingsRepository
{
  async get(): Promise<ChatSettings> {
    if (typeof window === "undefined") {
      return { ...DEFAULT_CHAT_SETTINGS };
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CHAT_SETTINGS };
      return normalizeChatSettings(JSON.parse(raw));
    } catch {
      // ข้อมูลเสียหรืออ่าน localStorage ไม่ได้ — กลับไปใช้ค่า default
      return { ...DEFAULT_CHAT_SETTINGS };
    }
  }

  async save(settings: ChatSettings): Promise<ChatSettings> {
    const normalized = normalizeChatSettings(settings);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch (error) {
        console.error("Error saving chat settings to localStorage:", error);
      }
    }

    return normalized;
  }
}
