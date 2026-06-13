/**
 * POST /api/agent
 * Agentic loop — ให้ jarvis เรียก tool query/แก้ข้อมูล workspace เองได้
 * - รับ messages (text ปกติจาก client: memory + history) + model + maxTokens
 * - loop: เรียก WaveSpeed (non-streaming) → ถ้า tool_calls → executeTool แตะ Turso → วน
 *         ถ้าไม่มี → stream คำตอบสุดท้ายเป็น SSE
 * - SSE ส่งกลับ: content delta (OpenAI-compatible), usage, และ event tool/error เฉพาะของ jarvis
 * ⚠️ tool รันฝั่ง server เท่านั้น (Turso repo) — API key/token ไม่หลุดไป client
 */

import { createWaveSpeedClient } from "@/src/infrastructure/ai/WaveSpeedClient";
import type {
  WaveSpeedChatMessage,
  WaveSpeedCompletion,
} from "@/src/infrastructure/ai/WaveSpeedClient";
import {
  WORKSPACE_TOOLS,
  executeTool,
} from "@/src/infrastructure/ai/workspaceTools";
import { TursoWorkspaceRepository } from "@/src/infrastructure/repositories/turso/TursoWorkspaceRepository";
import { DEFAULT_MODEL } from "@/src/application/ai/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["user", "assistant", "system"]);
const MAX_AGENT_STEPS = 6;

export async function POST(req: Request) {
  const client = createWaveSpeedClient();
  if (!client) {
    return Response.json(
      { error: "ยังไม่ได้ตั้งค่า WAVESPEED_API_KEY ในไฟล์ .env.local" },
      { status: 500 }
    );
  }

  let body: { messages?: unknown; model?: unknown; maxTokens?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const { messages, model, maxTokens } = body;

  const isValid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m) =>
        m &&
        typeof m.role === "string" &&
        VALID_ROLES.has(m.role) &&
        typeof m.content === "string"
    );
  if (!isValid) {
    return Response.json(
      { error: "ต้องส่ง messages อย่างน้อย 1 ข้อความ" },
      { status: 400 }
    );
  }

  const modelId =
    typeof model === "string" && model ? model : DEFAULT_MODEL;
  const maxTokensValue =
    typeof maxTokens === "number" &&
    Number.isInteger(maxTokens) &&
    maxTokens >= 1 &&
    maxTokens <= 32768
      ? maxTokens
      : undefined;

  const repo = new TursoWorkspaceRepository();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const done = () => {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      };

      try {
        const workspaces = await repo.listWorkspaces().catch(() => []);
        const convo: WaveSpeedChatMessage[] = [
          { role: "system", content: systemPrompt(workspaces) },
          ...(messages as { role: WaveSpeedChatMessage["role"]; content: string }[]).map(
            (m) => ({ role: m.role, content: m.content })
          ),
        ];

        let totalPrompt = 0;
        let totalCompletion = 0;

        for (let step = 0; step < MAX_AGENT_STEPS; step++) {
          const isLast = step === MAX_AGENT_STEPS - 1;
          const completion: WaveSpeedCompletion = await client.chatCompletion(
            {
              model: modelId,
              messages: convo,
              stream: false,
              tools: WORKSPACE_TOOLS,
              tool_choice: isLast ? "none" : "auto",
              ...(maxTokensValue !== undefined && { max_tokens: maxTokensValue }),
            },
            req.signal
          );

          if (completion.usage) {
            totalPrompt += completion.usage.promptTokens;
            totalCompletion += completion.usage.completionTokens;
          }

          const toolCalls = completion.message.tool_calls;
          if (toolCalls && toolCalls.length > 0 && !isLast) {
            // assistant message ที่ขอเรียก tool ต้อง append ก่อนผลลัพธ์ tool
            convo.push({
              role: "assistant",
              content: completion.message.content ?? null,
              tool_calls: toolCalls,
            });

            for (const tc of toolCalls) {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(tc.function.arguments || "{}");
              } catch {
                args = {};
              }
              send({
                jarvis_tool: {
                  tool: tc.function.name,
                  workspace:
                    typeof args.workspace === "string"
                      ? args.workspace
                      : undefined,
                },
              });
              const result = await executeTool(tc.function.name, args, repo);
              convo.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result ?? {}),
              });
            }
            continue;
          }

          // คำตอบสุดท้าย — chunk เป็นชิ้นเพื่อ typing effect
          const text = completion.message.content ?? "";
          for (const chunk of chunkText(text)) {
            send({ choices: [{ delta: { content: chunk } }] });
          }
          break;
        }

        send({
          usage: {
            prompt_tokens: totalPrompt,
            completion_tokens: totalCompletion,
          },
        });
        done();
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          controller.close();
          return;
        }
        console.error("Agent loop error:", error);
        send({ jarvis_error: "เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
        done();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function systemPrompt(workspaces: { name: string; description?: string }[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const list =
    workspaces.length > 0
      ? workspaces
          .map((w) => `- ${w.name}${w.description ? ` (${w.description})` : ""}`)
          .join("\n")
      : "(ยังไม่มี workspace — สร้างใหม่ด้วย create_workspace ได้)";

  return [
    "คุณคือ jarvis ผู้ช่วยส่วนตัวของผู้ใช้ ตอบเป็นภาษาไทย",
    `วันนี้คือ ${today}`,
    "",
    "คุณมี workspace = คลังข้อมูลที่ใช้ร่วมกันข้ามทุกบทสนทนา เก็บข้อมูลบริษัท/รายรับ/รายจ่าย/โน้ต ฯลฯ",
    "ผู้ใช้ให้สิทธิคุณเต็มที่ในการ อ่าน เพิ่ม แก้ไข ลบ ข้อมูล workspace ผ่าน tool ได้เองโดยไม่ต้องขออนุญาตหรือถามยืนยัน",
    "เมื่อผู้ใช้ถามถึงข้อมูลใน workspace ให้เรียก tool ดึงข้อมูลจริงก่อนเสมอ อย่าเดาหรือกุข้อมูล",
    "ถ้าผู้ใช้สั่งให้บันทึก/แก้/ลบข้อมูล ให้ลงมือผ่าน tool ทันที แล้วยืนยันผลให้ผู้ใช้ทราบ",
    "ถ้าอ้าง workspace ที่ยังไม่มี ให้เรียก list_workspaces ตรวจก่อน หรือถามผู้ใช้ว่าจะสร้างใหม่ไหม",
    "",
    "workspace ที่มีตอนนี้:",
    list,
  ].join("\n");
}

/**
 * ตัดข้อความยาวเป็นชิ้นเล็ก ~24 ตัว เพื่อให้ทยอยขึ้นแบบพิมพ์
 * ใช้ code-point (Array.from) กันไม่ให้ตัด surrogate pair (emoji) ขาดกลาง
 */
function chunkText(text: string): string[] {
  if (!text) return [];
  const points = Array.from(text);
  const size = 24;
  const chunks: string[] = [];
  for (let i = 0; i < points.length; i += size) {
    chunks.push(points.slice(i, i + size).join(""));
  }
  return chunks;
}
