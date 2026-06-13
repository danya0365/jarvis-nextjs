/**
 * /api/workspaces
 * GET  → list ทุก workspace
 * POST → สร้าง workspace ใหม่ (body: { name, description? })
 * ⚠️ ข้อมูลจริงอยู่บน Turso — repo รันฝั่ง server เท่านั้น
 */

import { TursoWorkspaceRepository } from "@/src/infrastructure/repositories/turso/TursoWorkspaceRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoWorkspaceRepository();

export async function GET() {
  try {
    const workspaces = await repository.listWorkspaces();
    return Response.json(workspaces);
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    return Response.json({ error: "โหลด workspace ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { name?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "ต้องระบุชื่อ workspace" }, { status: 400 });
  }

  try {
    const workspace = await repository.createWorkspace({
      name: body.name.trim(),
      description:
        typeof body.description === "string" ? body.description : undefined,
    });
    return Response.json(workspace, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    return Response.json({ error: "สร้าง workspace ไม่สำเร็จ" }, { status: 500 });
  }
}
