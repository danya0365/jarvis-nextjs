import { TursoChatSessionRepository } from "@/src/infrastructure/repositories/turso/TursoChatSessionRepository";
import { getProvider, type ProviderId } from "@/src/application/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoChatSessionRepository();

/** provider ที่ส่งมาอาจเป็นค่าแปลก — resolve เป็น id ที่มีจริงใน registry (ไม่งั้นคืน undefined = ใช้ default) */
function toProviderId(value: unknown): ProviderId | undefined {
  return typeof value === "string" ? getProvider(value).id : undefined;
}

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
  let body: { title?: string; model?: string; provider?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body ว่างได้ — สร้างด้วยค่า default
  }

  try {
    const session = await repository.create({
      title: typeof body.title === "string" ? body.title : undefined,
      model: typeof body.model === "string" ? body.model : undefined,
      provider: toProviderId(body.provider),
    });
    return Response.json(session, { status: 201 });
  } catch (error) {
    console.error("POST /api/sessions error:", error);
    return Response.json({ error: "สร้างแชทใหม่ไม่สำเร็จ" }, { status: 500 });
  }
}
