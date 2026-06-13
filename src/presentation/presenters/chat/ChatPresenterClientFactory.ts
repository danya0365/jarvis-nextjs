/**
 * ChatPresenterClientFactory
 * Factory for creating ChatPresenter instances on the client side
 * ✅ ใช้ LocalStorage repositories — ประวัติแชท/ตั้งค่า/ยอด token คงอยู่หลัง refresh
 */

"use client";

import { ChatPresenter } from "./ChatPresenter";
import { LocalStorageChatSessionRepository } from "@/src/infrastructure/repositories/localstorage/LocalStorageChatSessionRepository";
import { LocalStorageChatSettingsRepository } from "@/src/infrastructure/repositories/localstorage/LocalStorageChatSettingsRepository";
import { LocalStorageUsageLedgerRepository } from "@/src/infrastructure/repositories/localstorage/LocalStorageUsageLedgerRepository";

export class ChatPresenterClientFactory {
  static create(): ChatPresenter {
    const repository = new LocalStorageChatSessionRepository();
    const settingsRepository = new LocalStorageChatSettingsRepository();
    const usageLedger = new LocalStorageUsageLedgerRepository();

    // ⏳ สลับเป็น Supabase Repository ได้ภายหลังเมื่อมี backend
    // const repository = new SupabaseChatSessionRepository(supabase);

    return new ChatPresenter(repository, settingsRepository, usageLedger);
  }
}

export function createClientChatPresenter(): ChatPresenter {
  return ChatPresenterClientFactory.create();
}
