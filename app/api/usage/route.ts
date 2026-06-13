/**
 * /api/usage
 * GET    → ดึง usage ledger ทั้งหมด (presenter รวมยอดเอง)
 * POST   → append entry ใหม่ (body: CreateUsageLedgerEntryData)
 * DELETE → ล้างสถิติทั้งหมด
 */

import { TursoUsageLedgerRepository } from "@/src/infrastructure/repositories/turso/TursoUsageLedgerRepository";
import type { CreateUsageLedgerEntryData } from "@/src/application/repositories/IUsageLedgerRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoUsageLedgerRepository();

export async function GET() {
  try {
    const entries = await repository.getAll();
    return Response.json(entries);
  } catch (error) {
    console.error("GET /api/usage error:", error);
    return Response.json({ error: "โหลดสถิติการใช้งานไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: CreateUsageLedgerEntryData;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const entry = await repository.append(body);
    return Response.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/usage error:", error);
    return Response.json({ error: "บันทึกสถิติไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await repository.clear();
    return Response.json({ cleared: true });
  } catch (error) {
    console.error("DELETE /api/usage error:", error);
    return Response.json({ error: "ล้างสถิติไม่สำเร็จ" }, { status: 500 });
  }
}
