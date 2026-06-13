/**
 * /api/workspaces/[id]/records
 * GET  → list records (query: ?kind &query &limit)
 * POST → เพิ่ม record (body: { kind, data })
 */

import { TursoWorkspaceRepository } from "@/src/infrastructure/repositories/turso/TursoWorkspaceRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoWorkspaceRepository();

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  const { id } = await context.params;
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? undefined;
  const query = url.searchParams.get("query") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const records = await repository.listRecords(id, { kind, query, limit });
    return Response.json(records);
  } catch (error) {
    console.error("GET /api/workspaces/[id]/records error:", error);
    return Response.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(req: Request, context: Context) {
  const { id } = await context.params;
  let body: { kind?: unknown; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  if (typeof body.kind !== "string" || !body.kind.trim()) {
    return Response.json({ error: "ต้องระบุ kind" }, { status: 400 });
  }

  try {
    const record = await repository.addRecord(id, {
      kind: body.kind.trim(),
      data:
        body.data && typeof body.data === "object"
          ? (body.data as Record<string, unknown>)
          : {},
    });
    return Response.json(record, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces/[id]/records error:", error);
    return Response.json({ error: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
