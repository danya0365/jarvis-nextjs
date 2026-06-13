/**
 * Token estimation helpers
 * ใช้เป็น fallback กรณี upstream ไม่ส่ง usage จริงมา (เช่น กดหยุดกลาง stream)
 * และใช้คำนวณ preview ก่อนส่ง ("จะส่ง ~X tokens") ฝั่ง client
 *
 * Heuristic หยาบ: ~3 ตัวอักษรต่อ 1 token
 * (ภาษาไทย tokenize แพงกว่าอังกฤษ — ค่านี้เป็นค่ากลางที่เอนไปทาง overestimate
 * เพื่อให้ตัวเลขประมาณการไม่ต่ำกว่าค่าใช้จ่ายจริง)
 */

const CHARS_PER_TOKEN = 3;

/** overhead ต่อ message (role + โครงสร้าง chat template) */
const TOKENS_PER_MESSAGE_OVERHEAD = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateMessagesTokens(
  messages: Array<{ content: string }>
): number {
  return messages.reduce(
    (total, message) =>
      total + estimateTokens(message.content) + TOKENS_PER_MESSAGE_OVERHEAD,
    0
  );
}
