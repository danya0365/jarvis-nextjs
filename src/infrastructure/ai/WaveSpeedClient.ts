/**
 * WaveSpeedClient
 * Server-side adapter for WaveSpeed LLM API (OpenAI-compatible)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ ใช้เฉพาะฝั่ง server (API route) — API key ห้ามหลุดไป client
 */

import { OpenAICompatibleClient } from "./OpenAICompatibleClient";

const WAVESPEED_BASE_URL = "https://llm.wavespeed.ai/v1";

// Re-export types for backward compatibility
export type {
  OpenAIToolCall as WaveSpeedToolCall,
  OpenAIChatMessage as WaveSpeedChatMessage,
  OpenAITool as WaveSpeedTool,
  OpenAIChatCompletionBody as WaveSpeedChatCompletionBody,
  OpenAICompletion as WaveSpeedCompletion,
} from "./OpenAICompatibleClient";

/**
 * WaveSpeed-specific client extending the generic OpenAI-compatible client
 */
export class WaveSpeedClient extends OpenAICompatibleClient {
  constructor(apiKey: string) {
    super(apiKey, WAVESPEED_BASE_URL);
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