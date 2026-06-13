/**
 * HttpChatSettingsRepository
 * Implementation of IChatSettingsRepository ที่คุยกับ Turso ผ่าน /api/settings
 * Following Clean Architecture - this is in the Infrastructure layer (client adapter)
 * - get: ถ้าล้ม → คืน DEFAULT_CHAT_SETTINGS (graceful fallback)
 * - save: โยน error ถ้า response ไม่ ok
 */

import { IChatSettingsRepository } from "@/src/application/repositories/IChatSettingsRepository";
import {
  ChatSettings,
  DEFAULT_CHAT_SETTINGS,
} from "@/src/application/chat/settings";

const BASE = "/api/settings";

export class HttpChatSettingsRepository implements IChatSettingsRepository {
  async get(): Promise<ChatSettings> {
    try {
      const res = await fetch(BASE, { cache: "no-store" });
      if (!res.ok) return { ...DEFAULT_CHAT_SETTINGS };
      return (await res.json()) as ChatSettings;
    } catch {
      return { ...DEFAULT_CHAT_SETTINGS };
    }
  }

  async save(settings: ChatSettings): Promise<ChatSettings> {
    const res = await fetch(BASE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("บันทึกการตั้งค่าไม่สำเร็จ");
    return (await res.json()) as ChatSettings;
  }
}
