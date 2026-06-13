/**
 * /api/settings
 * GET → อ่าน ChatSettings (คืน default ถ้ายังไม่เคยบันทึก)
 * PUT → บันทึก ChatSettings (แทนที่ทั้ง object, normalize ในชั้น repo)
 * settings เป็น singleton ใช้ร่วมกันทุก session
 */

import { TursoChatSettingsRepository } from "@/src/infrastructure/repositories/turso/TursoChatSettingsRepository";
import type { ChatSettings } from "@/src/application/chat/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoChatSettingsRepository();

export async function GET() {
  try {
    const settings = await repository.get();
    return Response.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return Response.json({ error: "โหลดการตั้งค่าไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  let body: ChatSettings;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const saved = await repository.save(body);
    return Response.json(saved);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return Response.json({ error: "บันทึกการตั้งค่าไม่สำเร็จ" }, { status: 500 });
  }
}
