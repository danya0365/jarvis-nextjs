/**
 * /api/workspaces/[id]/transactions/summary
 * GET → สรุปการเงิน (query: ?from &to) → { income, expense, net, byCategory }
 */

import { TursoWorkspaceRepository } from "@/src/infrastructure/repositories/turso/TursoWorkspaceRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new TursoWorkspaceRepository();

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  const { id } = await context.params;
  const url = new URL(req.url);
  try {
    const summary = await repository.summarizeFinance(
      id,
      url.searchParams.get("from") ?? undefined,
      url.searchParams.get("to") ?? undefined
    );
    return Response.json(summary);
  } catch (error) {
    console.error("GET finance summary error:", error);
    return Response.json({ error: "สรุปการเงินไม่สำเร็จ" }, { status: 500 });
  }
}
