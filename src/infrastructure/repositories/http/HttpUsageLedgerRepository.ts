/**
 * HttpUsageLedgerRepository
 * Implementation of IUsageLedgerRepository ที่คุยกับ Turso ผ่าน /api/usage
 * Following Clean Architecture - this is in the Infrastructure layer (client adapter)
 * - getAll: ถ้าล้ม → คืน [] (graceful fallback)
 * - append/clear: โยน error ถ้า response ไม่ ok
 */

import {
  IUsageLedgerRepository,
  UsageLedgerEntry,
  CreateUsageLedgerEntryData,
} from "@/src/application/repositories/IUsageLedgerRepository";

const BASE = "/api/usage";

export class HttpUsageLedgerRepository implements IUsageLedgerRepository {
  async getAll(): Promise<UsageLedgerEntry[]> {
    try {
      const res = await fetch(BASE, { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as UsageLedgerEntry[]) : [];
    } catch {
      return [];
    }
  }

  async append(data: CreateUsageLedgerEntryData): Promise<UsageLedgerEntry> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("บันทึกสถิติไม่สำเร็จ");
    return (await res.json()) as UsageLedgerEntry;
  }

  async clear(): Promise<void> {
    const res = await fetch(BASE, { method: "DELETE" });
    if (!res.ok) throw new Error("ล้างสถิติไม่สำเร็จ");
  }
}
