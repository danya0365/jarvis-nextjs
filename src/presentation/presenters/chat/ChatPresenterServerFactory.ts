/**
 * ChatPresenterServerFactory
 * Factory for creating ChatPresenter instances on the server side
 * ✅ ใช้ Mock แบบไม่ seed — ข้อมูลจริงอยู่ใน localStorage ฝั่ง client
 *    server จึง render view model ว่างเสมอ แล้วให้ client hydrate เอง
 */

import { ChatPresenter } from "./ChatPresenter";
import { MockChatSessionRepository } from "@/src/infrastructure/repositories/mock/MockChatSessionRepository";
import { MockChatSettingsRepository } from "@/src/infrastructure/repositories/mock/MockChatSettingsRepository";
import { MockUsageLedgerRepository } from "@/src/infrastructure/repositories/mock/MockUsageLedgerRepository";

export class ChatPresenterServerFactory {
  static create(): ChatPresenter {
    const repository = new MockChatSessionRepository(false);
    const settingsRepository = new MockChatSettingsRepository();
    const usageLedger = new MockUsageLedgerRepository();
    return new ChatPresenter(repository, settingsRepository, usageLedger);
  }
}

export function createServerChatPresenter(): ChatPresenter {
  return ChatPresenterServerFactory.create();
}
