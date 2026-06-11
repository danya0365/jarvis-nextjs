/**
 * WaveSpeedClient
 * Server-side adapter for WaveSpeed LLM API (OpenAI-compatible)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ ใช้เฉพาะฝั่ง server (API route) — API key ห้ามหลุดไป client
 */

import type { ChatRole } from "@/src/application/repositories/IChatSessionRepository";

const WAVESPEED_BASE_URL = "https://llm.wavespeed.ai/v1";

export interface WaveSpeedChatMessage {
  role: ChatRole;
  content: string;
}

export interface WaveSpeedChatCompletionBody {
  model: string;
  messages: WaveSpeedChatMessage[];
  stream: boolean;
}

export class WaveSpeedClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = WAVESPEED_BASE_URL
  ) {}

  /**
   * เรียก chat completions แบบ streaming — คืน Response ดิบ
   * (route handler ส่ง body ต่อให้ client ตรงๆ แบบ pass-through)
   */
  async streamChatCompletion(
    body: WaveSpeedChatCompletionBody,
    signal?: AbortSignal
  ): Promise<Response> {
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  }
}

/**
 * อ่าน API key จาก env — คืน null ถ้ายังไม่ได้ตั้งค่า
 */
export function createWaveSpeedClient(): WaveSpeedClient | null {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) return null;
  return new WaveSpeedClient(apiKey);
}
