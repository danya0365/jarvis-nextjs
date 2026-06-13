/**
 * IUsageLedgerRepository
 * Repository interface for token usage ledger (บัญชีรายจ่าย token สะสม)
 * แยกจาก ChatSession เพื่อให้ยอดสะสมไม่หายแม้ลบแชต
 * Following Clean Architecture - this is in the Application layer
 */

export interface UsageLedgerEntry {
  id: string;
  /** วันที่แบบ local "YYYY-MM-DD" — ใช้รวมยอดรายวัน */
  date: string;
  /** WaveSpeed model ID เช่น "minimax/minimax-m2.7" */
  model: string;
  promptTokens: number;
  completionTokens: number;
  /** true = ตัวเลขประมาณการ (upstream ไม่ส่ง usage จริง) */
  estimated: boolean;
  /** ประเภทการเรียก — "chat" = ตอบผู้ใช้, "summary" = สรุปความจำ (optional, backward-compat) */
  kind?: "chat" | "summary";
}

export type CreateUsageLedgerEntryData = Omit<UsageLedgerEntry, "id">;

export interface IUsageLedgerRepository {
  /**
   * Get all entries (เรียงตามลำดับที่บันทึก)
   */
  getAll(): Promise<UsageLedgerEntry[]>;

  /**
   * Append a new entry
   */
  append(data: CreateUsageLedgerEntryData): Promise<UsageLedgerEntry>;

  /**
   * Clear all entries (ปุ่มล้างสถิติ)
   */
  clear(): Promise<void>;
}
