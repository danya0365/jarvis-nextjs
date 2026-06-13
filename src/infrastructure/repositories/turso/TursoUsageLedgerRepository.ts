/**
 * TursoUsageLedgerRepository
 * Implementation of IUsageLedgerRepository using Turso (libsql SQLite)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ server-side เท่านั้น — append-only ledger, presenter รวมยอดเองในหน่วยความจำ
 */

import "server-only";
import type { Row } from "@libsql/client";
import {
  IUsageLedgerRepository,
  UsageLedgerEntry,
  CreateUsageLedgerEntryData,
} from "@/src/application/repositories/IUsageLedgerRepository";
import { getTursoClient, ensureSchema } from "@/src/infrastructure/db/turso";

export class TursoUsageLedgerRepository implements IUsageLedgerRepository {
  async getAll(): Promise<UsageLedgerEntry[]> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute(
      "SELECT * FROM usage_ledger"
    );
    return rows.map(rowToEntry);
  }

  async append(data: CreateUsageLedgerEntryData): Promise<UsageLedgerEntry> {
    await ensureSchema();
    const entry: UsageLedgerEntry = { id: crypto.randomUUID(), ...data };

    await getTursoClient().execute({
      sql: `INSERT INTO usage_ledger
              (id, date, model, prompt_tokens, completion_tokens, estimated, kind)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entry.id,
        entry.date,
        entry.model,
        entry.promptTokens,
        entry.completionTokens,
        entry.estimated ? 1 : 0,
        entry.kind ?? null,
      ],
    });

    return entry;
  }

  async clear(): Promise<void> {
    await ensureSchema();
    await getTursoClient().execute("DELETE FROM usage_ledger");
  }
}

/** map แถว SQL (snake_case) → UsageLedgerEntry entity (camelCase) */
function rowToEntry(row: Row): UsageLedgerEntry {
  const kind = row.kind;
  return {
    id: String(row.id),
    date: String(row.date),
    model: String(row.model),
    promptTokens: Number(row.prompt_tokens),
    completionTokens: Number(row.completion_tokens),
    estimated: Number(row.estimated) === 1,
    kind:
      kind === "chat" || kind === "summary"
        ? (kind as "chat" | "summary")
        : undefined,
  };
}
