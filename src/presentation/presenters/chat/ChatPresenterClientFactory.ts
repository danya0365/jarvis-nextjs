/**
 * ChatPresenterClientFactory
 * Factory for creating ChatPresenter instances on the client side
 * ✅ ใช้ Http repositories — คุยกับ Turso (libsql SQLite) ผ่าน /api/* (ฝั่ง server)
 *    ข้อมูลคงอยู่ใน DB กลาง ใช้ข้ามเครื่อง/เบราว์เซอร์ได้ (ไม่ผูก localStorage แล้ว)
 */

"use client";

import { ChatPresenter } from "./ChatPresenter";
import { HttpChatSessionRepository } from "@/src/infrastructure/repositories/http/HttpChatSessionRepository";
import { HttpChatSettingsRepository } from "@/src/infrastructure/repositories/http/HttpChatSettingsRepository";
import { HttpUsageLedgerRepository } from "@/src/infrastructure/repositories/http/HttpUsageLedgerRepository";

export class ChatPresenterClientFactory {
  static create(): ChatPresenter {
    const repository = new HttpChatSessionRepository();
    const settingsRepository = new HttpChatSettingsRepository();
    const usageLedger = new HttpUsageLedgerRepository();

    return new ChatPresenter(repository, settingsRepository, usageLedger);
  }
}

export function createClientChatPresenter(): ChatPresenter {
  return ChatPresenterClientFactory.create();
}
