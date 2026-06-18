/**
 * /api/user-profile
 * GET → อ่าน user profile (singleton, คืน profile ว่างถ้ายังไม่มี)
 * PUT → บันทึก profile (body: { profile })
 * ใช้เป็น context ชั้นที่ 2 ของ AI + แก้ผ่าน UI
 */

import { TursoUserProfileRepository } from "@/src/infrastructure/repositories/turso/TursoUserProfileRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoUserProfileRepository();

export async function GET() {
  try {
    const profile = await repository.get();
    return Response.json(profile);
  } catch (error) {
    console.error("GET /api/user-profile error:", error);
    return Response.json({ error: "โหลดโปรไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  let body: { profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const profile = typeof body.profile === "string" ? body.profile : "";

  try {
    const saved = await repository.save(profile);
    return Response.json(saved);
  } catch (error) {
    console.error("PUT /api/user-profile error:", error);
    return Response.json({ error: "บันทึกโปรไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}
