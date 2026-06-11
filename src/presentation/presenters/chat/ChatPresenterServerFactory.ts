/**
 * ChatPresenterServerFactory
 * Factory for creating ChatPresenter instances on the server side
 * ✅ ใช้ Mock แบบไม่ seed — ข้อมูลจริงอยู่ใน localStorage ฝั่ง client
 *    server จึง render view model ว่างเสมอ แล้วให้ client hydrate เอง
 */

import { ChatPresenter } from "./ChatPresenter";
import { MockChatSessionRepository } from "@/src/infrastructure/repositories/mock/MockChatSessionRepository";

export class ChatPresenterServerFactory {
  static create(): ChatPresenter {
    const repository = new MockChatSessionRepository(false);
    return new ChatPresenter(repository);
  }
}

export function createServerChatPresenter(): ChatPresenter {
  return ChatPresenterServerFactory.create();
}
