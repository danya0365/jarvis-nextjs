/**
 * workspaceTools
 * นิยาม tool (OpenAI function-calling) + ตัว execute ที่แตะ Turso
 * ใช้โดย agent loop (app/api/agent/route.ts)
 * ⚠️ server-side เท่านั้น — tool คือ interface เดียวที่ AI เข้าถึง DB ได้
 *    ผู้ใช้ให้สิทธิเต็ม: อ่าน/เพิ่ม/แก้/ลบ ได้เองโดยไม่ต้องถามยืนยัน
 *
 * 🪶 descriptions ถูกย่อให้สั้นเพื่อประหยัด input token (schema นี้ส่งทุก step ของ loop)
 *    คง ชื่อ tool + ชื่อ param + enum + required ไว้ (สิ่งที่โมเดลใช้เลือก tool/เติม args)
 */

import "server-only";
import type {
  IWorkspaceRepository,
  TransactionDirection,
} from "@/src/application/repositories/IWorkspaceRepository";
import type { IUserProfileRepository } from "@/src/application/repositories/IUserProfileRepository";

/** repos ที่ tool ต้องใช้ */
export interface ToolDeps {
  workspace: IWorkspaceRepository;
  profile: IUserProfileRepository;
}

/** tool schema รูปแบบ OpenAI — ส่งให้ WaveSpeed ใน field `tools` */
export interface OpenAiTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

function fn(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = []
): OpenAiTool {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: { type: "object", properties, required },
    },
  };
}

const S = { type: "string" };
const N = { type: "number" };
const ws = { workspace: { type: "string", description: "ชื่อหรือ id ของ workspace" } };
const dir = { type: "string", enum: ["income", "expense"] };

export const WORKSPACE_TOOLS: OpenAiTool[] = [
  fn("list_workspaces", "ดู workspace ทั้งหมด", {}),
  fn(
    "create_workspace",
    "สร้าง workspace ใหม่",
    { name: { type: "string", description: "ชื่อ (ห้ามซ้ำ)" }, description: S },
    ["name"]
  ),
  fn(
    "list_records",
    "ดู/ค้น records ใน workspace",
    { ...ws, kind: S, query: S, limit: N },
    ["workspace"]
  ),
  fn(
    "add_record",
    "เพิ่ม record ลง workspace",
    {
      ...ws,
      kind: { type: "string", description: "ประเภท เช่น company-info, contact, note" },
      data: { type: "object", description: "เนื้อหา key-value" },
    },
    ["workspace", "kind", "data"]
  ),
  fn(
    "update_record",
    "แก้ record (ใช้ record_id จาก list_records)",
    { record_id: S, kind: S, data: { type: "object" } },
    ["record_id"]
  ),
  fn("delete_record", "ลบ record", { record_id: S }, ["record_id"]),
  fn(
    "add_transaction",
    "บันทึกรายรับ/รายจ่าย",
    {
      ...ws,
      date: { type: "string", description: "YYYY-MM-DD" },
      direction: { ...dir, description: "income=รายรับ expense=รายจ่าย" },
      amount: { type: "number", description: "บวกเสมอ" },
      category: S,
      note: S,
    },
    ["workspace", "date", "direction", "amount"]
  ),
  fn(
    "list_transactions",
    "ดูรายการเงิน (กรองได้)",
    {
      ...ws,
      from: { type: "string", description: "YYYY-MM-DD" },
      to: { type: "string", description: "YYYY-MM-DD" },
      direction: dir,
      category: S,
    },
    ["workspace"]
  ),
  fn(
    "summarize_finance",
    "สรุปการเงิน: รายรับ รายจ่าย กำไรสุทธิ แยกหมวด",
    { ...ws, from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD" } },
    ["workspace"]
  ),
  fn(
    "update_user_profile",
    "เขียนโปรไฟล์ผู้ใช้ใหม่ทั้งก้อน (รวมข้อมูลเดิม+ใหม่) เมื่อรู้ข้อมูลถาวรของผู้ใช้ เช่น ชื่อ บทบาท ความชอบ",
    { profile: { type: "string", description: "โปรไฟล์ฉบับเต็มที่ปรับปรุงแล้ว กระชับ" } },
    ["profile"]
  ),
];

type Args = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/**
 * รัน tool ตามชื่อ + args — คืนผลเป็น object JSON-serializable
 * ทุก error คืน { error } (ไม่ throw) เพื่อให้ AI อ่านแล้วปรับตัว ไม่ทำให้ loop ล่ม
 */
export async function executeTool(
  name: string,
  args: Args,
  deps: ToolDeps
): Promise<unknown> {
  const repo = deps.workspace;
  try {
    switch (name) {
      case "list_workspaces":
        return await repo.listWorkspaces();

      case "create_workspace": {
        const wsName = str(args.name);
        if (!wsName) return { error: "ต้องระบุชื่อ workspace" };
        return await repo.createWorkspace({
          name: wsName,
          description: str(args.description),
        });
      }

      case "list_records": {
        const w = await resolve(repo, args.workspace);
        if ("error" in w) return w;
        return await repo.listRecords(w.id, {
          kind: str(args.kind),
          query: str(args.query),
          limit: num(args.limit),
        });
      }

      case "add_record": {
        const w = await resolve(repo, args.workspace);
        if ("error" in w) return w;
        const kind = str(args.kind);
        if (!kind) return { error: "ต้องระบุ kind" };
        const data =
          args.data && typeof args.data === "object"
            ? (args.data as Record<string, unknown>)
            : {};
        return await repo.addRecord(w.id, { kind, data });
      }

      case "update_record": {
        const recordId = str(args.record_id);
        if (!recordId) return { error: "ต้องระบุ record_id" };
        return await repo.updateRecord(recordId, {
          kind: str(args.kind),
          data:
            args.data && typeof args.data === "object"
              ? (args.data as Record<string, unknown>)
              : undefined,
        });
      }

      case "delete_record": {
        const recordId = str(args.record_id);
        if (!recordId) return { error: "ต้องระบุ record_id" };
        const deleted = await repo.deleteRecord(recordId);
        return { deleted };
      }

      case "add_transaction": {
        const w = await resolve(repo, args.workspace);
        if ("error" in w) return w;
        const date = str(args.date);
        const amount = num(args.amount);
        const direction = args.direction;
        if (!date || (direction !== "income" && direction !== "expense") || amount === undefined) {
          return { error: "ต้องระบุ date (YYYY-MM-DD), direction (income/expense), amount" };
        }
        return await repo.addTransaction(w.id, {
          date,
          direction: direction as TransactionDirection,
          amount,
          category: str(args.category),
          note: str(args.note),
        });
      }

      case "list_transactions": {
        const w = await resolve(repo, args.workspace);
        if ("error" in w) return w;
        const d = args.direction;
        return await repo.listTransactions(w.id, {
          from: str(args.from),
          to: str(args.to),
          direction: d === "income" || d === "expense" ? d : undefined,
          category: str(args.category),
        });
      }

      case "summarize_finance": {
        const w = await resolve(repo, args.workspace);
        if ("error" in w) return w;
        return await repo.summarizeFinance(w.id, str(args.from), str(args.to));
      }

      case "update_user_profile": {
        const profile = typeof args.profile === "string" ? args.profile : "";
        const saved = await deps.profile.save(profile);
        return { ok: true, updatedAt: saved.updatedAt };
      }

      default:
        return { error: `ไม่รู้จัก tool: ${name}` };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "tool ทำงานผิดพลาด",
    };
  }
}

/** resolve workspace จากชื่อ/​id — คืน { error } ถ้าไม่เจอ */
async function resolve(
  repo: IWorkspaceRepository,
  workspace: unknown
): Promise<{ id: string } | { error: string }> {
  const key = str(workspace);
  if (!key) return { error: "ต้องระบุ workspace (ชื่อหรือ id)" };
  const found = await repo.getWorkspaceByIdOrName(key);
  if (!found) {
    return {
      error: `ไม่พบ workspace "${key}" — เรียก list_workspaces หรือ create_workspace`,
    };
  }
  return { id: found.id };
}
