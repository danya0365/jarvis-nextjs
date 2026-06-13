/**
 * workspaceTools
 * นิยาม tool (OpenAI function-calling) + ตัว execute ที่แตะ Turso workspace repo
 * ใช้โดย agent loop (app/api/agent/route.ts)
 * ⚠️ server-side เท่านั้น — tool คือ interface เดียวที่ AI เข้าถึง DB ได้
 *    ผู้ใช้ให้สิทธิเต็ม: อ่าน/เพิ่ม/แก้/ลบ ได้เองโดยไม่ต้องถามยืนยัน
 */

import "server-only";
import type {
  IWorkspaceRepository,
  TransactionDirection,
} from "@/src/application/repositories/IWorkspaceRepository";

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

const workspaceArg = {
  workspace: {
    type: "string",
    description: "ชื่อ หรือ id ของ workspace ที่ต้องการทำงานด้วย",
  },
};

export const WORKSPACE_TOOLS: OpenAiTool[] = [
  fn("list_workspaces", "ดูรายการ workspace ทั้งหมดที่มีอยู่ (ชื่อ + คำอธิบาย)", {}),
  fn(
    "create_workspace",
    "สร้าง workspace ใหม่ เมื่อผู้ใช้ต้องการคลังข้อมูลใหม่",
    {
      name: { type: "string", description: "ชื่อ workspace (ต้องไม่ซ้ำ)" },
      description: { type: "string", description: "คำอธิบายสั้นๆ (ไม่บังคับ)" },
    },
    ["name"]
  ),
  fn(
    "list_records",
    "ดู/ค้นข้อมูลทั่วไป (records) ใน workspace เช่น ข้อมูลบริษัท ผู้ติดต่อ โน้ต",
    {
      ...workspaceArg,
      kind: {
        type: "string",
        description: "กรองตามประเภท เช่น 'company-info', 'contact' (ไม่บังคับ)",
      },
      query: { type: "string", description: "คำค้นในเนื้อหา (ไม่บังคับ)" },
      limit: { type: "number", description: "จำกัดจำนวน (ไม่บังคับ)" },
    },
    ["workspace"]
  ),
  fn(
    "add_record",
    "เพิ่มข้อมูลทั่วไปลง workspace — data เป็น object อะไรก็ได้ตามเนื้อหา",
    {
      ...workspaceArg,
      kind: {
        type: "string",
        description: "ประเภทข้อมูลที่ตั้งเอง เช่น 'company-info', 'contact', 'note'",
      },
      data: {
        type: "object",
        description: "เนื้อหาแบบ key-value เช่น {\"ชื่อบริษัท\":\"...\",\"ปีก่อตั้ง\":2024}",
      },
    },
    ["workspace", "kind", "data"]
  ),
  fn(
    "update_record",
    "แก้ไขข้อมูล record ที่มีอยู่ (ใช้ record_id จาก list_records)",
    {
      record_id: { type: "string", description: "id ของ record" },
      kind: { type: "string", description: "เปลี่ยนประเภท (ไม่บังคับ)" },
      data: { type: "object", description: "เนื้อหาใหม่ (แทนที่ของเดิม, ไม่บังคับ)" },
    },
    ["record_id"]
  ),
  fn(
    "delete_record",
    "ลบ record (ใช้ record_id จาก list_records)",
    { record_id: { type: "string", description: "id ของ record" } },
    ["record_id"]
  ),
  fn(
    "add_transaction",
    "บันทึกรายการเงิน (รายรับ/รายจ่าย) ลง workspace",
    {
      ...workspaceArg,
      date: { type: "string", description: "วันที่รูปแบบ YYYY-MM-DD" },
      direction: {
        type: "string",
        enum: ["income", "expense"],
        description: "income = รายรับ, expense = รายจ่าย",
      },
      amount: { type: "number", description: "จำนวนเงิน (บวกเสมอ)" },
      category: { type: "string", description: "หมวดหมู่ เช่น 'ค่าจ้าง', 'ค่าโฆษณา' (ไม่บังคับ)" },
      note: { type: "string", description: "บันทึกเพิ่มเติม (ไม่บังคับ)" },
    },
    ["workspace", "date", "direction", "amount"]
  ),
  fn(
    "list_transactions",
    "ดูรายการเงินใน workspace (กรองช่วงวันที่/ประเภท/หมวดได้)",
    {
      ...workspaceArg,
      from: { type: "string", description: "ตั้งแต่วันที่ YYYY-MM-DD (ไม่บังคับ)" },
      to: { type: "string", description: "ถึงวันที่ YYYY-MM-DD (ไม่บังคับ)" },
      direction: {
        type: "string",
        enum: ["income", "expense"],
        description: "กรองเฉพาะรายรับหรือรายจ่าย (ไม่บังคับ)",
      },
      category: { type: "string", description: "กรองตามหมวด (ไม่บังคับ)" },
    },
    ["workspace"]
  ),
  fn(
    "summarize_finance",
    "สรุปการเงินของ workspace: รวมรายรับ รายจ่าย กำไรสุทธิ และแยกตามหมวด",
    {
      ...workspaceArg,
      from: { type: "string", description: "ตั้งแต่วันที่ YYYY-MM-DD (ไม่บังคับ)" },
      to: { type: "string", description: "ถึงวันที่ YYYY-MM-DD (ไม่บังคับ)" },
    },
    ["workspace"]
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
  repo: IWorkspaceRepository
): Promise<unknown> {
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
        const ws = await resolve(repo, args.workspace);
        if ("error" in ws) return ws;
        return await repo.listRecords(ws.id, {
          kind: str(args.kind),
          query: str(args.query),
          limit: num(args.limit),
        });
      }

      case "add_record": {
        const ws = await resolve(repo, args.workspace);
        if ("error" in ws) return ws;
        const kind = str(args.kind);
        if (!kind) return { error: "ต้องระบุ kind" };
        const data =
          args.data && typeof args.data === "object"
            ? (args.data as Record<string, unknown>)
            : {};
        return await repo.addRecord(ws.id, { kind, data });
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
        const ws = await resolve(repo, args.workspace);
        if ("error" in ws) return ws;
        const date = str(args.date);
        const amount = num(args.amount);
        const direction = args.direction;
        if (!date || (direction !== "income" && direction !== "expense") || amount === undefined) {
          return { error: "ต้องระบุ date (YYYY-MM-DD), direction (income/expense), amount" };
        }
        return await repo.addTransaction(ws.id, {
          date,
          direction: direction as TransactionDirection,
          amount,
          category: str(args.category),
          note: str(args.note),
        });
      }

      case "list_transactions": {
        const ws = await resolve(repo, args.workspace);
        if ("error" in ws) return ws;
        const dir = args.direction;
        return await repo.listTransactions(ws.id, {
          from: str(args.from),
          to: str(args.to),
          direction:
            dir === "income" || dir === "expense" ? dir : undefined,
          category: str(args.category),
        });
      }

      case "summarize_finance": {
        const ws = await resolve(repo, args.workspace);
        if ("error" in ws) return ws;
        return await repo.summarizeFinance(ws.id, str(args.from), str(args.to));
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
  const ws = await repo.getWorkspaceByIdOrName(key);
  if (!ws) {
    return {
      error: `ไม่พบ workspace "${key}" — เรียก list_workspaces เพื่อดูรายการ หรือ create_workspace เพื่อสร้างใหม่`,
    };
  }
  return { id: ws.id };
}
