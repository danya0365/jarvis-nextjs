/**
 * /api/sessions/[id]
 * GET    → ดึง session เดียว
 * PATCH  → แก้ session (body: UpdateChatSessionData — title/model/messages/memory/memoryUpToCount)
 * DELETE → ลบ session
 * ⚠️ Next 16: context.params เป็น Promise — ต้อง await
 */

import { TursoChatSessionRepository } from "@/src/infrastructure/repositories/turso/TursoChatSessionRepository";
import type { UpdateChatSessionData } from "@/src/application/repositories/IChatSessionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoChatSessionRepository();

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const { id } = await context.params;
  try {
    const session = await repository.getById(id);
    if (!session) {
      return Response.json({ error: "ไม่พบแชทนี้" }, { status: 404 });
    }
    return Response.json(session);
  } catch (error) {
    console.error("GET /api/sessions/[id] error:", error);
    return Response.json({ error: "โหลดแชทไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: Context) {
  const { id } = await context.params;

  let body: UpdateChatSessionData;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const session = await repository.update(id, body);
    return Response.json(session);
  } catch (error) {
    // repo โยน "ไม่พบ session ที่ต้องการแก้ไข" เมื่อไม่เจอ id
    const message = error instanceof Error ? error.message : "";
    if (message.includes("ไม่พบ")) {
      return Response.json({ error: message }, { status: 404 });
    }
    console.error("PATCH /api/sessions/[id] error:", error);
    return Response.json({ error: "บันทึกแชทไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: Context) {
  const { id } = await context.params;
  try {
    const deleted = await repository.delete(id);
    return Response.json({ deleted });
  } catch (error) {
    console.error("DELETE /api/sessions/[id] error:", error);
    return Response.json({ error: "ลบแชทไม่สำเร็จ" }, { status: 500 });
  }
}
