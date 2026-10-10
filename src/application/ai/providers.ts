/**
 * Provider Registry
 * จัดการ LLM providers (WaveSpeed, 9router, etc.) แบบปลั๊กอิน
 * Following Clean Architecture - this is in the Application layer
 */

import type { OpenAICompatibleClient } from "@/src/infrastructure/ai/OpenAICompatibleClient";
import { createWaveSpeedClient } from "@/src/infrastructure/ai/WaveSpeedClient";
import { createNineRouterClient } from "@/src/infrastructure/ai/NineRouterClient";
import { createOpenCodeClient } from "@/src/infrastructure/ai/OpenCodeClient";
import {
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  NINE_ROUTER_DEFAULT_MODEL,
  OPENCODE_DEFAULT_MODEL,
  getModelPricing,
  isKnownModel,
} from "@/src/application/ai/models";

export type ProviderId = "wavespeed" | "ninerouter" | "opencode";

export interface Provider {
  id: ProviderId;
  label: string;
  defaultModel: string;
  /** ชื่อ env var ที่ provider นี้ใช้ — แสดงใน error เมื่อยังไม่ได้ตั้งค่า */
  envVar: string;
  /** สร้าง client instance — คืน null ถ้ายังไม่ได้ตั้งค่า env */
  createClient: () => OpenAICompatibleClient | null;
  /** โมเดลที่รองรับโดย provider นี้ (filter จาก MODEL_OPTIONS) */
  supportedModels: string[];
}

/** Registry ของ providers ทั้งหมด */
export const PROVIDERS: Record<ProviderId, Provider> = {
  wavespeed: {
    id: "wavespeed",
    label: "WaveSpeed",
    defaultModel: DEFAULT_MODEL,
    envVar: "WAVESPEED_API_KEY",
    createClient: createWaveSpeedClient,
    supportedModels: [
      "minimax/minimax-m2.7",
      "minimax/minimax-m3",
      "anthropic/claude-fable-5",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-sonnet-4.6",
      "openai/gpt-5.5",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.2-pro",
      "google/gemini-3.5-flash",
      "google/gemini-3-flash-preview",
      "deepseek/deepseek-v4",
      "deepseek/deepseek-v4-pro",
    ],
  },
  ninerouter: {
    id: "ninerouter",
    label: "9router (Virtual Ocean)",
    defaultModel: NINE_ROUTER_DEFAULT_MODEL,
    envVar: "NINE_ROUTER_API_KEY",
    createClient: createNineRouterClient,
    // ดึงจาก catalog ตัวเดียว — ตัวที่ sync เพิ่มเข้า models.ts จะติดมาอัตโนมัติ
    // ไม่ hardcode ซ้ำสองที่ (เคยทำแล้ว sync ทับโมเดลที่ verify แล้วหาย)
    supportedModels: MODEL_OPTIONS.filter((m) => m.vendor === "9router").map(
      (m) => m.id
    ),
  },
  opencode: {
    id: "opencode",
    label: "OpenCode Zen",
    defaultModel: OPENCODE_DEFAULT_MODEL,
    envVar: "OPENCODE_API_KEY",
    createClient: createOpenCodeClient,
    // Zen เรียกตรงได้ ไม่ต้องผูกบัญชี upstream — id ไม่มี prefix (ไม่ใช่ oc/ ของ 9router)
    supportedModels: MODEL_OPTIONS.filter((m) => m.vendor === "OpenCode").map(
      (m) => m.id
    ),
  },
};

/** Default provider ID */
export const DEFAULT_PROVIDER: ProviderId = "ninerouter";

/**
 * auto-router = ให้ provider เลือกโมเดลจริงเองทุกครั้ง
 * (เช่น openrouter/auto) — ตัวที่ได้อาจเปลี่ยนตามเวลา จึงไม่เหมาะกับงานที่ต้องผลลัพธ์คงที่
 */
export function isAutoRouter(modelId: string): boolean {
  return modelId.split("/").includes("auto");
}

/** ดึง provider จาก ID — คืน default ถ้าไม่พบ */
export function getProvider(id: string): Provider {
  return PROVIDERS[id as ProviderId] ?? PROVIDERS[DEFAULT_PROVIDER];
}

/** ดึง default provider */
export function getDefaultProvider(): Provider {
  return PROVIDERS[DEFAULT_PROVIDER];
}

/** ตรวจสอบว่า model ID อยู่ใน catalog รวม (cross-provider validation) */
export function isValidModelForProvider(modelId: string, providerId: ProviderId): boolean {
  if (!isKnownModel(modelId)) return false;
  const provider = getProvider(providerId);
  return provider.supportedModels.includes(modelId);
}

/** หา provider ที่รองรับ model นี้ — คืน null ถ้าไม่มี provider ไหนรองรับ */
export function findProviderForModel(modelId: string): Provider | null {
  for (const provider of Object.values(PROVIDERS)) {
    if (provider.supportedModels.includes(modelId)) {
      return provider;
    }
  }
  return null;
}

/** ดึงรายการ models ที่ provider นี้รองรับ — ใช้ render dropdown */
export function getModelsForProvider(providerId: ProviderId): string[] {
  return getProvider(providerId).supportedModels;
}

/**
 * resolve model ที่ provider ใช้จริง — ถ้า model ที่บันทึกไว้ provider นี้ไม่รองรับ
 * ให้ fallback ไป default ของ provider (ข้ามกัน provider = upstream ตอบ 404)
 */
export function resolveModelForProvider(
  modelId: string | null | undefined,
  providerId: ProviderId
): string {
  const provider = getProvider(providerId);
  if (modelId && provider.supportedModels.includes(modelId)) return modelId;
  return provider.defaultModel;
}

/**
 * โมเดลถูกที่สุดที่ provider นี้รองรับ — ใช้เป็น summary model
 * (สรุปความจำควรใช้โมเดลถูก แต่ต้องอยู่ใน provider เดียวกันกับที่คุย)
 * ข้าม auto-router ("auto" ใน id) เพราะตัวที่ได้จริงเปลี่ยนตามเวลา
 * → สรุปความจำเดิมอาจถูกสรุปด้วยคนละโมเดลในแต่ละรอบ
 */
export function getCheapestModelForProvider(providerId: ProviderId): string {
  const provider = getProvider(providerId);
  const candidates = provider.supportedModels.filter(
    (id) => !isAutoRouter(id)
  );
  const pool = candidates.length > 0 ? candidates : provider.supportedModels;

  return pool.reduce((cheapest, id) => {
    const price = getModelPricing(id);
    const cheapestPrice = getModelPricing(cheapest);
    if (!price) return cheapest;
    if (!cheapestPrice) return id;
    return price.inputPerMTok + price.outputPerMTok <
      cheapestPrice.inputPerMTok + cheapestPrice.outputPerMTok
      ? id
      : cheapest;
  }, provider.defaultModel);
}