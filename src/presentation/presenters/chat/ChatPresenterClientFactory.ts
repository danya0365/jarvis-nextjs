/**
 * ChatPresenterClientFactory
 * Factory for creating ChatPresenter instances on the client side
 * ✅ ใช้ LocalStorage repository — ประวัติแชทคงอยู่หลัง refresh
 */

"use client";

import { ChatPresenter } from "./ChatPresenter";
import { LocalStorageChatSessionRepository } from "@/src/infrastructure/repositories/localstorage/LocalStorageChatSessionRepository";

export class ChatPresenterClientFactory {
  static create(): ChatPresenter {
    const repository = new LocalStorageChatSessionRepository();

    // ⏳ สลับเป็น Supabase Repository ได้ภายหลังเมื่อมี backend
    // const repository = new SupabaseChatSessionRepository(supabase);

    return new ChatPresenter(repository);
  }
}

export function createClientChatPresenter(): ChatPresenter {
  return ChatPresenterClientFactory.create();
}
