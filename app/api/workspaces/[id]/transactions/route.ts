/**
 * /api/workspaces/[id]/transactions
 * GET  → list transactions (query: ?from &to &direction &category)
 * POST → เพิ่ม transaction (body: { date, direction, amount, category?, note? })
 */

import { TursoWorkspaceRepository } from "@/src/infrastructure/repositories/turso/TursoWorkspaceRepository";
import type { TransactionDirection } from "@/src/application/repositories/IWorkspaceRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoWorkspaceRepository();

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  const { id } = await context.params;
  const url = new URL(req.url);
  const directionParam = url.searchParams.get("direction");
  const direction =
    directionParam === "income" || directionParam === "expense"
      ? directionParam
      : undefined;

  try {
    const transactions = await repository.listTransactions(id, {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      direction,
      category: url.searchParams.get("category") ?? undefined,
    });
    return Response.json(transactions);
  } catch (error) {
    console.error("GET transactions error:", error);
    return Response.json({ error: "โหลดรายการเงินไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(req: Request, context: Context) {
  const { id } = await context.params;
  let body: {
    date?: unknown;
    direction?: unknown;
    amount?: unknown;
    category?: unknown;
    note?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  if (
    typeof body.date !== "string" ||
    (body.direction !== "income" && body.direction !== "expense") ||
    typeof body.amount !== "number" ||
    !Number.isFinite(body.amount)
  ) {
    return Response.json(
      { error: "ต้องระบุ date, direction (income/expense), amount" },
      { status: 400 }
    );
  }

  try {
    const tx = await repository.addTransaction(id, {
      date: body.date,
      direction: body.direction as TransactionDirection,
      amount: body.amount,
      category: typeof body.category === "string" ? body.category : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    return Response.json(tx, { status: 201 });
  } catch (error) {
    console.error("POST transactions error:", error);
    return Response.json({ error: "บันทึกรายการเงินไม่สำเร็จ" }, { status: 500 });
  }
}
