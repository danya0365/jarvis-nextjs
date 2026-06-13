/**
 * TursoWorkspaceRepository
 * Implementation of IWorkspaceRepository using Turso (libsql SQLite)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ server-side เท่านั้น — ใช้ผ่าน API route handlers + agent loop (tools)
 */

import "server-only";
import type { Row } from "@libsql/client";
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
  TransactionDirection,
  FinanceSummary,
} from "@/src/application/repositories/IWorkspaceRepository";
import { getTursoClient, ensureSchema } from "@/src/infrastructure/db/turso";

export class TursoWorkspaceRepository implements IWorkspaceRepository {
  // ---- workspaces ----

  async listWorkspaces(): Promise<Workspace[]> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute(
      "SELECT * FROM workspaces ORDER BY updated_at DESC"
    );
    return rows.map(rowToWorkspace);
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute({
      sql: "SELECT * FROM workspaces WHERE id = ? LIMIT 1",
      args: [id],
    });
    return rows.length > 0 ? rowToWorkspace(rows[0]) : null;
  }

  async getWorkspaceByIdOrName(idOrName: string): Promise<Workspace | null> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute({
      sql: "SELECT * FROM workspaces WHERE id = ? OR name = ? LIMIT 1",
      args: [idOrName, idOrName],
    });
    return rows.length > 0 ? rowToWorkspace(rows[0]) : null;
  }

  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    await ensureSchema();
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };

    await getTursoClient().execute({
      sql: `INSERT INTO workspaces (id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        workspace.id,
        workspace.name,
        workspace.description ?? null,
        workspace.createdAt,
        workspace.updatedAt,
      ],
    });

    return workspace;
  }

  async updateWorkspace(
    id: string,
    data: UpdateWorkspaceData
  ): Promise<Workspace> {
    await ensureSchema();
    const sets: string[] = [];
    const args: (string | null)[] = [];

    if (data.name !== undefined) {
      sets.push("name = ?");
      args.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push("description = ?");
      args.push(data.description ?? null);
    }
    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id);

    const result = await getTursoClient().execute({
      sql: `UPDATE workspaces SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });
    if (result.rowsAffected === 0) {
      throw new Error("ไม่พบ workspace ที่ต้องการแก้ไข");
    }

    const updated = await this.getWorkspace(id);
    if (!updated) throw new Error("ไม่พบ workspace ที่ต้องการแก้ไข");
    return updated;
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    await ensureSchema();
    // ลบข้อมูลลูกด้วย (records + transactions) ในชุดเดียว
    await getTursoClient().batch(
      [
        {
          sql: "DELETE FROM workspace_records WHERE workspace_id = ?",
          args: [id],
        },
        {
          sql: "DELETE FROM workspace_transactions WHERE workspace_id = ?",
          args: [id],
        },
        { sql: "DELETE FROM workspaces WHERE id = ?", args: [id] },
      ],
      "write"
    );
    // batch ไม่คืน rowsAffected รวม — เช็คว่าหายจริง
    const gone = await this.getWorkspace(id);
    return gone === null;
  }

  // ---- records ----

  async listRecords(
    workspaceId: string,
    query?: RecordQuery
  ): Promise<WorkspaceRecord[]> {
    await ensureSchema();
    const where: string[] = ["workspace_id = ?"];
    const args: (string | number)[] = [workspaceId];

    if (query?.kind) {
      where.push("kind = ?");
      args.push(query.kind);
    }
    if (query?.query) {
      where.push("LOWER(data) LIKE ?");
      args.push(`%${query.query.toLowerCase()}%`);
    }

    let sql = `SELECT * FROM workspace_records WHERE ${where.join(
      " AND "
    )} ORDER BY updated_at DESC`;
    if (query?.limit && Number.isFinite(query.limit)) {
      sql += " LIMIT ?";
      args.push(Math.max(1, Math.floor(query.limit)));
    }

    const { rows } = await getTursoClient().execute({ sql, args });
    return rows.map(rowToRecord);
  }

  async addRecord(
    workspaceId: string,
    data: AddRecordData
  ): Promise<WorkspaceRecord> {
    await ensureSchema();
    const now = new Date().toISOString();
    const record: WorkspaceRecord = {
      id: crypto.randomUUID(),
      workspaceId,
      kind: data.kind,
      data: data.data ?? {},
      createdAt: now,
      updatedAt: now,
    };

    await getTursoClient().execute({
      sql: `INSERT INTO workspace_records
              (id, workspace_id, kind, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.workspaceId,
        record.kind,
        JSON.stringify(record.data),
        record.createdAt,
        record.updatedAt,
      ],
    });

    return record;
  }

  async updateRecord(
    recordId: string,
    data: Partial<AddRecordData>
  ): Promise<WorkspaceRecord> {
    await ensureSchema();
    const sets: string[] = [];
    const args: (string | null)[] = [];

    if (data.kind !== undefined) {
      sets.push("kind = ?");
      args.push(data.kind);
    }
    if (data.data !== undefined) {
      sets.push("data = ?");
      args.push(JSON.stringify(data.data));
    }
    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(recordId);

    const result = await getTursoClient().execute({
      sql: `UPDATE workspace_records SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });
    if (result.rowsAffected === 0) {
      throw new Error("ไม่พบ record ที่ต้องการแก้ไข");
    }

    const { rows } = await getTursoClient().execute({
      sql: "SELECT * FROM workspace_records WHERE id = ? LIMIT 1",
      args: [recordId],
    });
    return rowToRecord(rows[0]);
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    await ensureSchema();
    const result = await getTursoClient().execute({
      sql: "DELETE FROM workspace_records WHERE id = ?",
      args: [recordId],
    });
    return result.rowsAffected > 0;
  }

  // ---- transactions ----

  async addTransaction(
    workspaceId: string,
    data: AddTransactionData
  ): Promise<WorkspaceTransaction> {
    await ensureSchema();
    const tx: WorkspaceTransaction = {
      id: crypto.randomUUID(),
      workspaceId,
      date: data.date,
      direction: data.direction,
      amount: data.amount,
      category: data.category,
      note: data.note,
      createdAt: new Date().toISOString(),
    };

    await getTursoClient().execute({
      sql: `INSERT INTO workspace_transactions
              (id, workspace_id, date, direction, amount, category, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.id,
        tx.workspaceId,
        tx.date,
        tx.direction,
        tx.amount,
        tx.category ?? null,
        tx.note ?? null,
        tx.createdAt,
      ],
    });

    return tx;
  }

  async listTransactions(
    workspaceId: string,
    query?: TransactionQuery
  ): Promise<WorkspaceTransaction[]> {
    await ensureSchema();
    const where: string[] = ["workspace_id = ?"];
    const args: string[] = [workspaceId];

    if (query?.from) {
      where.push("date >= ?");
      args.push(query.from);
    }
    if (query?.to) {
      where.push("date <= ?");
      args.push(query.to);
    }
    if (query?.direction) {
      where.push("direction = ?");
      args.push(query.direction);
    }
    if (query?.category) {
      where.push("category = ?");
      args.push(query.category);
    }

    const { rows } = await getTursoClient().execute({
      sql: `SELECT * FROM workspace_transactions WHERE ${where.join(
        " AND "
      )} ORDER BY date DESC, created_at DESC`,
      args,
    });
    return rows.map(rowToTransaction);
  }

  async summarizeFinance(
    workspaceId: string,
    from?: string,
    to?: string
  ): Promise<FinanceSummary> {
    await ensureSchema();
    const where: string[] = ["workspace_id = ?"];
    const args: string[] = [workspaceId];
    if (from) {
      where.push("date >= ?");
      args.push(from);
    }
    if (to) {
      where.push("date <= ?");
      args.push(to);
    }
    const whereClause = where.join(" AND ");

    const totals = await getTursoClient().execute({
      sql: `SELECT direction, SUM(amount) AS total
              FROM workspace_transactions WHERE ${whereClause}
            GROUP BY direction`,
      args,
    });

    let income = 0;
    let expense = 0;
    for (const row of totals.rows) {
      const total = Number(row.total) || 0;
      if (row.direction === "income") income = total;
      else if (row.direction === "expense") expense = total;
    }

    const byCat = await getTursoClient().execute({
      sql: `SELECT direction, COALESCE(category, 'ไม่ระบุ') AS category,
                   SUM(amount) AS total
              FROM workspace_transactions WHERE ${whereClause}
            GROUP BY direction, category
            ORDER BY total DESC`,
      args,
    });

    return {
      income,
      expense,
      net: income - expense,
      byCategory: byCat.rows.map((row) => ({
        category: String(row.category),
        direction: row.direction as TransactionDirection,
        total: Number(row.total) || 0,
      })),
    };
  }
}

// ---- row → entity mappers (snake_case → camelCase) ----

function rowToWorkspace(row: Row): Workspace {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description === null ? undefined : String(row.description),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToRecord(row: Row): WorkspaceRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    kind: String(row.kind),
    data: parseData(row.data),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToTransaction(row: Row): WorkspaceTransaction {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    date: String(row.date),
    direction: row.direction as TransactionDirection,
    amount: Number(row.amount) || 0,
    category: row.category === null ? undefined : String(row.category),
    note: row.note === null ? undefined : String(row.note),
    createdAt: String(row.created_at),
  };
}

function parseData(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return {};
  }
}
