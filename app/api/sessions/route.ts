/**
 * /api/sessions
 * GET  → list ทุก session (เรียง updatedAt ใหม่สุดก่อน)
 * POST → สร้าง session ใหม่ (body: CreateChatSessionData)
 * ⚠️ ข้อมูลจริงอยู่บน Turso — repo รันฝั่ง server เท่านั้น (token เป็นความลับ)
 */

import { TursoChatSessionRepository } from "@/src/infrastructure/repositories/turso/TursoChatSessionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoChatSessionRepository();

export async function GET() {
  try {
    const sessions = await repository.getAll();
    return Response.json(sessions);
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return Response.json({ error: "โหลดประวัติแชทไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { title?: string; model?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body ว่างได้ — สร้างด้วยค่า default
  }

  try {
    const session = await repository.create({
      title: typeof body.title === "string" ? body.title : undefined,
      model: typeof body.model === "string" ? body.model : undefined,
    });
    return Response.json(session, { status: 201 });
  } catch (error) {
    console.error("POST /api/sessions error:", error);
    return Response.json({ error: "สร้างแชทใหม่ไม่สำเร็จ" }, { status: 500 });
  }
}
