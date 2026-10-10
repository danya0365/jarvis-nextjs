/**
 * NineRouterClient (Virtual Ocean / 9router.com)
 * Server-side adapter for 9router LLM API (OpenAI-compatible)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ ใช้เฉพาะฝั่ง server (API route) — API key ห้ามหลุดไป client
 */

import { OpenAICompatibleClient } from "./OpenAICompatibleClient";

const NINE_ROUTER_BASE_URL = "https://nine-router-1.easy-ai.online/v1";

/**
 * 9router-specific client extending the generic OpenAI-compatible client
 */
export class NineRouterClient extends OpenAICompatibleClient {
  constructor(apiKey: string) {
    super(apiKey, NINE_ROUTER_BASE_URL);
  }
}

/**
 * อ่าน API key จาก env — คืน null ถ้ายังไม่ได้ตั้งค่า
 */
export function createNineRouterClient(): NineRouterClient | null {
  const apiKey = process.env.NINE_ROUTER_API_KEY;
  if (!apiKey) return null;
  return new NineRouterClient(apiKey);
}