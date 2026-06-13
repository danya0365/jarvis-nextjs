/**
 * /api/workspaces/[id]
 * GET    → ดึง workspace เดียว
 * PATCH  → แก้ชื่อ/คำอธิบาย (body: UpdateWorkspaceData)
 * DELETE → ลบ workspace (ลบ records + transactions ที่ผูกด้วย)
 */

import { TursoWorkspaceRepository } from "@/src/infrastructure/repositories/turso/TursoWorkspaceRepository";
import type { UpdateWorkspaceData } from "@/src/application/repositories/IWorkspaceRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoWorkspaceRepository();

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const { id } = await context.params;
  try {
    const workspace = await repository.getWorkspace(id);
    if (!workspace) {
      return Response.json({ error: "ไม่พบ workspace นี้" }, { status: 404 });
    }
    return Response.json(workspace);
  } catch (error) {
    console.error("GET /api/workspaces/[id] error:", error);
    return Response.json({ error: "โหลด workspace ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: Context) {
  const { id } = await context.params;
  let body: UpdateWorkspaceData;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const workspace = await repository.updateWorkspace(id, body);
    return Response.json(workspace);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("ไม่พบ")) {
      return Response.json({ error: message }, { status: 404 });
    }
    console.error("PATCH /api/workspaces/[id] error:", error);
    return Response.json({ error: "บันทึก workspace ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: Context) {
  const { id } = await context.params;
  try {
    const deleted = await repository.deleteWorkspace(id);
    return Response.json({ deleted });
  } catch (error) {
    console.error("DELETE /api/workspaces/[id] error:", error);
    return Response.json({ error: "ลบ workspace ไม่สำเร็จ" }, { status: 500 });
  }
}
