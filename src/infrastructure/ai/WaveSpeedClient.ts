/**
 * WaveSpeedClient
 * Server-side adapter for WaveSpeed LLM API (OpenAI-compatible)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ ใช้เฉพาะฝั่ง server (API route) — API key ห้ามหลุดไป client
 */

import type { ChatRole } from "@/src/application/repositories/IChatSessionRepository";

const WAVESPEED_BASE_URL = "https://llm.wavespeed.ai/v1";

/** tool_call ที่โมเดลขอเรียก (OpenAI function-calling) */
export interface WaveSpeedToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface WaveSpeedChatMessage {
  /** "tool" สำหรับส่งผลลัพธ์ tool กลับเข้า loop */
  role: ChatRole | "tool";
  /** assistant ที่มี tool_calls อาจมี content = null */
  content: string | null;
  /** เฉพาะ assistant message ที่ขอเรียก tool */
  tool_calls?: WaveSpeedToolCall[];
  /** เฉพาะ tool message — ผูกกับ tool_call ที่ตอบ */
  tool_call_id?: string;
}

export interface WaveSpeedTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface WaveSpeedChatCompletionBody {
  model: string;
  messages: WaveSpeedChatMessage[];
  stream: boolean;
  /** จำกัดความยาวคำตอบ — ช่วยคุมค่าใช้จ่าย output tokens */
  max_tokens?: number;
  /** include_usage: true → chunk สุดท้ายก่อน [DONE] จะมี usage (prompt/completion tokens) */
  stream_options?: { include_usage: boolean };
  /** function-calling tools — ให้โมเดลขอเรียกเพื่อ query/แก้ข้อมูล */
  tools?: WaveSpeedTool[];
  tool_choice?: "auto" | "none" | "required";
}

/** ผลจาก chatCompletion (non-streaming) — ใช้ใน agent loop */
export interface WaveSpeedCompletion {
  message: {
    role: string;
    content: string | null;
    tool_calls?: WaveSpeedToolCall[];
  };
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    /** prompt tokens ที่ hit cache (prompt caching) — วัดผล optimize */
    cachedTokens: number;
  } | null;
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

  /**
   * เรียก chat completions แบบ non-streaming — parse JSON คืน message + tool_calls + usage
   * ใช้ใน agent loop เพื่ออ่าน tool_calls ได้ง่าย (ไม่ต้อง parse SSE deltas)
   * โยน error ถ้า upstream ไม่ ok (route handler จัดการต่อ)
   */
  async chatCompletion(
    body: WaveSpeedChatCompletionBody,
    signal?: AbortSignal
  ): Promise<WaveSpeedCompletion> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...body, stream: false }),
      signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`WaveSpeed ${res.status}: ${detail.slice(0, 300)}`);
    }

    const json = await res.json();
    const choice = json?.choices?.[0] ?? {};
    const message = choice.message ?? { role: "assistant", content: "" };
    const rawUsage = json?.usage;

    return {
      message: {
        role: message.role ?? "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      },
      finishReason: choice.finish_reason ?? null,
      usage: rawUsage
        ? {
            promptTokens: Number(rawUsage.prompt_tokens) || 0,
            completionTokens: Number(rawUsage.completion_tokens) || 0,
            cachedTokens:
              Number(rawUsage.prompt_tokens_details?.cached_tokens) || 0,
          }
        : null,
    };
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
