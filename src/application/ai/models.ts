/**
 * WaveSpeed LLM model catalog
 * ใช้ร่วมกันทั้ง client (dropdown เลือก model) และ server (default fallback ใน API route)
 * Model ID format: vendor/model — ดูทั้งหมดที่ https://wavespeed.ai/llm
 */

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export const DEFAULT_MODEL = "minimax/minimax-m2.7";

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "minimax/minimax-m2.7",
    label: "MiniMax M2.7",
    description: "ค่าเริ่มต้น — เร็ว ราคาถูก context 205K",
  },
  {
    id: "anthropic/claude-opus-4.6",
    label: "Claude Opus 4.6",
    description: "คุณภาพคำตอบสูง เหมาะกับงานซับซ้อน",
  },
  {
    id: "openai/gpt-5.2-pro",
    label: "GPT-5.2 Pro",
    description: "โมเดลเรือธงจาก OpenAI",
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    description: "ตอบเร็ว เหมาะกับบทสนทนาทั่วไป",
  },
  {
    id: "deepseek/deepseek-v4",
    label: "DeepSeek V4",
    description: "ราคาประหยัด ความสามารถสูง",
  },
];
