/**
 * OpenCodeClient (OpenCode Zen)
 * Server-side adapter for OpenCode Zen LLM API (OpenAI-compatible)
 * ⚠️ ใช้เฉพาะฝั่ง server (API route) — API key ห้ามหลุดไป client
 *
 * ต่างจาก 9router ตรงที่เรียกตรงได้ ไม่ต้องผูกบัญชี upstream ราย provider
 * และโมเดลฟรีเรียกผ่าน Zen ได้ (ผ่าน 9router จะโดน 403 FreeTierError)
 * เพราะ Zen คือตัว gateway เอง ไม่ใช่ aggregator
 */

import { OpenAICompatibleClient } from "./OpenAICompatibleClient";

const OPENCODE_BASE_URL = "https://opencode.ai/zen/v1";

/** Zen เป็น OpenAI-compatible — reuse client กลางได้เลย */
export class OpenCodeClient extends OpenAICompatibleClient {
  constructor(apiKey: string) {
    super(apiKey, OPENCODE_BASE_URL);
  }
}

/** อ่าน API key จาก env — คืน null ถ้ายังไม่ได้ตั้งค่า */
export function createOpenCodeClient(): OpenCodeClient | null {
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) return null;
  return new OpenCodeClient(apiKey);
}
