/**
 * HttpWorkspaceRepository
 * Implementation of IWorkspaceRepository ที่คุยกับ Turso ผ่าน /api/workspaces
 * Following Clean Architecture - this is in the Infrastructure layer (client adapter)
 * - read: ถ้าล้ม → คืนค่าว่าง (graceful fallback ไม่ให้ UI crash)
 * - write: โยน error ถ้า response ไม่ ok
 * ใช้โดย UI (WorkspacePanel) — ส่วน agent loop ฝั่ง server ใช้ TursoWorkspaceRepository ตรง
 */

import {
  IWorkspaceRepository,
  Workspace,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceRecord,
  AddRecordData,
  RecordQuery,
  WorkspaceTransaction,
  AddTransactionData,
  TransactionQuery,
  FinanceSummary,
} from "@/src/application/repositories/IWorkspaceRepository";

const BASE = "/api/workspaces";

const EMPTY_SUMMARY: FinanceSummary = {
  income: 0,
  expense: 0,
  net: 0,
  byCategory: [],
};

export class HttpWorkspaceRepository implements IWorkspaceRepository {
  // ---- workspaces ----

  async listWorkspaces(): Promise<Workspace[]> {
    return getArray<Workspace>(BASE);
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    try {
      const res = await fetch(`${BASE}/${id}`, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as Workspace;
    } catch {
      return null;
    }
  }

  async getWorkspaceByIdOrName(idOrName: string): Promise<Workspace | null> {
    // ฝั่ง client resolve ด้วย list (server มี endpoint id-only) — เพียงพอสำหรับ UI
    const all = await this.listWorkspaces();
    return (
      all.find((w) => w.id === idOrName || w.name === idOrName) ?? null
    );
  }

  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    return writeJson<Workspace>(BASE, "POST", data, "สร้าง workspace ไม่สำเร็จ");
  }

  async updateWorkspace(
    id: string,
    data: UpdateWorkspaceData
  ): Promise<Workspace> {
    return writeJson<Workspace>(
      `${BASE}/${id}`,
      "PATCH",
      data,
      "บันทึก workspace ไม่สำเร็จ"
    );
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("ลบ workspace ไม่สำเร็จ");
    const data = (await res.json()) as { deleted?: boolean };
    return Boolean(data.deleted);
  }

  // ---- records ----

  async listRecords(
    workspaceId: string,
    query?: RecordQuery
  ): Promise<WorkspaceRecord[]> {
    const params = new URLSearchParams();
    if (query?.kind) params.set("kind", query.kind);
    if (query?.query) params.set("query", query.query);
    if (query?.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getArray<WorkspaceRecord>(
      `${BASE}/${workspaceId}/records${qs ? `?${qs}` : ""}`
    );
  }

  async addRecord(
    workspaceId: string,
    data: AddRecordData
  ): Promise<WorkspaceRecord> {
    return writeJson<WorkspaceRecord>(
      `${BASE}/${workspaceId}/records`,
      "POST",
      data,
      "บันทึกข้อมูลไม่สำเร็จ"
    );
  }

  async updateRecord(
    recordId: string,
    data: Partial<AddRecordData>
  ): Promise<WorkspaceRecord> {
    // recordId routing ผ่าน [id] placeholder (server ใช้แค่ recordId)
    return writeJson<WorkspaceRecord>(
      `${BASE}/_/records/${recordId}`,
      "PATCH",
      data,
      "บันทึกข้อมูลไม่สำเร็จ"
    );
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    const res = await fetch(`${BASE}/_/records/${recordId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("ลบข้อมูลไม่สำเร็จ");
    const data = (await res.json()) as { deleted?: boolean };
    return Boolean(data.deleted);
  }

  // ---- transactions ----

  async addTransaction(
    workspaceId: string,
    data: AddTransactionData
  ): Promise<WorkspaceTransaction> {
    return writeJson<WorkspaceTransaction>(
      `${BASE}/${workspaceId}/transactions`,
      "POST",
      data,
      "บันทึกรายการเงินไม่สำเร็จ"
    );
  }

  async listTransactions(
    workspaceId: string,
    query?: TransactionQuery
  ): Promise<WorkspaceTransaction[]> {
    const params = new URLSearchParams();
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    if (query?.direction) params.set("direction", query.direction);
    if (query?.category) params.set("category", query.category);
    const qs = params.toString();
    return getArray<WorkspaceTransaction>(
      `${BASE}/${workspaceId}/transactions${qs ? `?${qs}` : ""}`
    );
  }

  async summarizeFinance(
    workspaceId: string,
    from?: string,
    to?: string
  ): Promise<FinanceSummary> {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    try {
      const res = await fetch(
        `${BASE}/${workspaceId}/transactions/summary${qs ? `?${qs}` : ""}`,
        { cache: "no-store" }
      );
      if (!res.ok) return { ...EMPTY_SUMMARY };
      return (await res.json()) as FinanceSummary;
    } catch {
      return { ...EMPTY_SUMMARY };
    }
  }
}

// ---- helpers ----

async function getArray<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJson<T>(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
  errorMessage: string
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(errorMessage);
  return (await res.json()) as T;
}
