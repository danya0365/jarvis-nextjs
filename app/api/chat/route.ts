/**
 * POST /api/chat
 * Proxy ไป WaveSpeed LLM (OpenAI-compatible) แบบ streaming
 * - API key อยู่ฝั่ง server เท่านั้น
 * - pass-through SSE body จาก upstream ตรงๆ (ไม่ parse/transform)
 * - ไม่แตะ session repository — ประวัติแชทเก็บฝั่ง client (localStorage)
 */

import { createWaveSpeedClient } from "@/src/infrastructure/ai/WaveSpeedClient";
import { DEFAULT_MODEL } from "@/src/application/ai/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["user", "assistant", "system"]);

export async function POST(req: Request) {
  const client = createWaveSpeedClient();
  if (!client) {
    return Response.json(
      { error: "ยังไม่ได้ตั้งค่า WAVESPEED_API_KEY ในไฟล์ .env.local" },
      { status: 500 }
    );
  }

  let body: { messages?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const { messages, model } = body;

  const isValidMessages =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (message) =>
        message &&
        typeof message.role === "string" &&
        VALID_ROLES.has(message.role) &&
        typeof message.content === "string"
    );

  if (!isValidMessages) {
    return Response.json(
      { error: "ต้องส่ง messages อย่างน้อย 1 ข้อความ" },
      { status: 400 }
    );
  }

  try {
    const upstream = await client.streamChatCompletion(
      {
        model: typeof model === "string" && model ? model : DEFAULT_MODEL,
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: true,
      },
      // propagate abort จาก client ไป upstream — กด "หยุด" แล้ว request ไม่ค้าง
      req.signal
    );

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      console.error("WaveSpeed API error:", upstream.status, detail);
      return Response.json(
        { error: "เกิดข้อผิดพลาดจาก AI กรุณาลองใหม่อีกครั้ง" },
        { status: upstream.status || 502 }
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // client ยกเลิกเอง — ไม่ใช่ error
      return new Response(null, { status: 499 });
    }

    console.error("Error calling WaveSpeed API:", error);
    return Response.json(
      { error: "เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      { status: 502 }
    );
  }
}
