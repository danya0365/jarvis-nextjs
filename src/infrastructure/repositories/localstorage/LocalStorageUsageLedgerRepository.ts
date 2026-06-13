/**
 * LocalStorageUsageLedgerRepository
 * Implementation of IUsageLedgerRepository using browser localStorage
 * บัญชีรายจ่าย token สะสม — แยก key จาก sessions เพื่อให้ยอดไม่หายแม้ลบแชต
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ ใช้ได้เฉพาะฝั่ง client เท่านั้น — ห้าม import ใน server factory
 */

import {
  IUsageLedgerRepository,
  UsageLedgerEntry,
  CreateUsageLedgerEntryData,
} from "@/src/application/repositories/IUsageLedgerRepository";

const STORAGE_KEY = "jarvis.chat.usage";

export class LocalStorageUsageLedgerRepository
  implements IUsageLedgerRepository
{
  async getAll(): Promise<UsageLedgerEntry[]> {
    return this.load();
  }

  async append(data: CreateUsageLedgerEntryData): Promise<UsageLedgerEntry> {
    const entries = this.load();
    const newEntry: UsageLedgerEntry = {
      id: crypto.randomUUID(),
      ...data,
    };

    entries.push(newEntry);
    this.save(entries);
    return newEntry;
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing usage ledger in localStorage:", error);
    }
  }

  private load(): UsageLedgerEntry[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as UsageLedgerEntry[]) : [];
    } catch {
      // ข้อมูลเสียหรืออ่าน localStorage ไม่ได้ — เริ่มใหม่จาก list ว่าง
      return [];
    }
  }

  private save(entries: UsageLedgerEntry[]): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error("Error saving usage ledger to localStorage:", error);
    }
  }
}
