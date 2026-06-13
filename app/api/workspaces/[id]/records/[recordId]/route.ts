/**
 * /api/workspaces/[id]/records/[recordId]
 * PATCH  → แก้ record (body: { kind?, data? })
 * DELETE → ลบ record
 * (operate ด้วย recordId — [id] อยู่ใน path เพื่อความชัดของ REST)
 */

import { TursoWorkspaceRepository } from "@/src/infrastructure/repositories/turso/TursoWorkspaceRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoWorkspaceRepository();

type Context = { params: Promise<{ id: string; recordId: string }> };

export async function PATCH(req: Request, context: Context) {
  const { recordId } = await context.params;
  let body: { kind?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const record = await repository.updateRecord(recordId, body);
    return Response.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("ไม่พบ")) {
      return Response.json({ error: message }, { status: 404 });
    }
    console.error("PATCH record error:", error);
    return Response.json({ error: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: Context) {
  const { recordId } = await context.params;
  try {
    const deleted = await repository.deleteRecord(recordId);
    return Response.json({ deleted });
  } catch (error) {
    console.error("DELETE record error:", error);
    return Response.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
