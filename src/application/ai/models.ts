/**
 * WaveSpeed LLM model catalog
 * ใช้ร่วมกันทั้ง client (dropdown เลือก model) และ server (default fallback ใน API route)
 * Model ID format: vendor/model — ดูทั้งหมดที่ https://wavespeed.ai/llm
 */

export interface ModelPricing {
  /** USD ต่อ 1M input tokens */
  inputPerMTok: number;
  /** USD ต่อ 1M output tokens */
  outputPerMTok: number;
}

export interface ModelOption {
  id: string;
  label: string;
  description: string;
  /** ชื่อค่ายสำหรับจัดกลุ่มใน dropdown เช่น "Anthropic" */
  vendor: string;
  /** ราคาโดยประมาณจากหน้า wavespeed.ai/llm — แก้ที่นี่จุดเดียวเมื่อราคาเปลี่ยน */
  pricing: ModelPricing;
}

export interface ModelGroup {
  vendor: string;
  models: ModelOption[];
}

export const DEFAULT_MODEL = "minimax/minimax-m2.7";

export const MODEL_OPTIONS: ModelOption[] = [
  // ── MiniMax ──
  {
    id: "minimax/minimax-m2.7",
    label: "MiniMax M2.7",
    description: "ค่าเริ่มต้น — เร็ว ราคาถูก context 205K",
    vendor: "MiniMax",
    pricing: { inputPerMTok: 0.3, outputPerMTok: 1.2 },
  },
  {
    id: "minimax/minimax-m3",
    label: "MiniMax M3",
    description: "รุ่นใหม่กว่า M2.7 — งาน agent/วิเคราะห์เอกสาร context 1M ราคาประหยัด",
    vendor: "MiniMax",
    pricing: { inputPerMTok: 0.6, outputPerMTok: 2.4 },
  },
  // ── Anthropic ──
  {
    id: "anthropic/claude-fable-5",
    label: "Claude Fable 5",
    description: "เรือธงตระกูล Claude 5 — reasoning ขั้นสูง งาน agent/โค้ดระยะยาว context 1M",
    vendor: "Anthropic",
    pricing: { inputPerMTok: 10, outputPerMTok: 50 },
  },
  {
    id: "anthropic/claude-opus-4.8",
    label: "Claude Opus 4.8",
    description: "โค้ดและงาน agent ซับซ้อน context 1M — ถูกกว่า Opus รุ่นก่อน",
    vendor: "Anthropic",
    pricing: { inputPerMTok: 4.75, outputPerMTok: 23.75 },
  },
  {
    id: "anthropic/claude-opus-4.7",
    label: "Claude Opus 4.7",
    description: "งาน agent หลายขั้นตอนต่อเนื่อง context 1M",
    vendor: "Anthropic",
    pricing: { inputPerMTok: 5, outputPerMTok: 25 },
  },
  {
    id: "anthropic/claude-opus-4.6",
    label: "Claude Opus 4.6",
    description: "คุณภาพคำตอบสูง เหมาะกับงานซับซ้อน",
    vendor: "Anthropic",
    pricing: { inputPerMTok: 5, outputPerMTok: 25 },
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    description: "สมดุลคุณภาพ/ราคา — context 1M รองรับงานทั่วไปถึงซับซ้อน",
    vendor: "Anthropic",
    pricing: { inputPerMTok: 2.85, outputPerMTok: 14.25 },
  },
  // ── OpenAI ──
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    description: "agentic coding/computer use/deep research — context 1M",
    vendor: "OpenAI",
    pricing: { inputPerMTok: 5, outputPerMTok: 30 },
  },
  {
    id: "openai/gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    description: "reasoning ทีละขั้นแม่นยำสูง — แพงมาก ใช้เฉพาะงานยากจริงๆ",
    vendor: "OpenAI",
    pricing: { inputPerMTok: 30, outputPerMTok: 180 },
  },
  {
    id: "openai/gpt-5.2-pro",
    label: "GPT-5.2 Pro",
    description: "โมเดลเรือธงจาก OpenAI",
    vendor: "OpenAI",
    pricing: { inputPerMTok: 15, outputPerMTok: 120 },
  },
  // ── Google ──
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    description: "โค้ดขั้นสูง/งาน agent ขนาน context 1M รองรับ multimodal",
    vendor: "Google",
    pricing: { inputPerMTok: 1.5, outputPerMTok: 9 },
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    description: "ตอบเร็ว เหมาะกับบทสนทนาทั่วไป",
    vendor: "Google",
    pricing: { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  },
  // ── DeepSeek ──
  {
    id: "deepseek/deepseek-v4",
    label: "DeepSeek V4",
    description: "ราคาประหยัด ความสามารถสูง",
    vendor: "DeepSeek",
    pricing: { inputPerMTok: 0.28, outputPerMTok: 1.1 },
  },
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    description: "เก่งโค้ด/คณิต/งาน agent ระดับท็อป context 1M ราคาคุ้ม",
    vendor: "DeepSeek",
    pricing: { inputPerMTok: 1.84, outputPerMTok: 3.66 },
  },
];

/**
 * จัดกลุ่มตามค่าย (เรียงตามลำดับใน MODEL_OPTIONS) — ใช้ render <optgroup> ใน dropdown
 */
export const MODEL_GROUPS: ModelGroup[] = MODEL_OPTIONS.reduce<ModelGroup[]>(
  (groups, model) => {
    const group = groups.find((g) => g.vendor === model.vendor);
    if (group) {
      group.models.push(model);
    } else {
      groups.push({ vendor: model.vendor, models: [model] });
    }
    return groups;
  },
  [],
);

/**
 * โมเดลที่ราคารวม (input + output) ต่ำสุด — ใช้เป็น default ของการสรุปความจำ
 * (การสรุปกิน token เพิ่ม จึงควร default ไปที่โมเดลถูกที่สุดเพื่อให้คุ้ม)
 */
export const DEFAULT_SUMMARY_MODEL: string = MODEL_OPTIONS.reduce(
  (cheapest, model) => {
    const cost = model.pricing.inputPerMTok + model.pricing.outputPerMTok;
    const cheapestCost =
      cheapest.pricing.inputPerMTok + cheapest.pricing.outputPerMTok;
    return cost < cheapestCost ? model : cheapest;
  },
  MODEL_OPTIONS[0],
).id;

export function getModelPricing(modelId: string): ModelPricing | null {
  return MODEL_OPTIONS.find((model) => model.id === modelId)?.pricing ?? null;
}

/** true ถ้า modelId มีอยู่จริงในแคตาล็อก */
export function isKnownModel(modelId: string): boolean {
  return MODEL_OPTIONS.some((model) => model.id === modelId);
}

/**
 * คำนวณค่าใช้จ่าย (USD) — คืน null ถ้าไม่รู้ราคา model นั้น
 */
export function calculateCostUsd(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  const pricing = getModelPricing(modelId);
  if (!pricing) return null;

  return (
    (promptTokens / 1_000_000) * pricing.inputPerMTok +
    (completionTokens / 1_000_000) * pricing.outputPerMTok
  );
}
