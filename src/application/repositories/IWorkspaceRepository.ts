/**
 * IWorkspaceRepository
 * Repository interface for workspaces — คลังข้อมูลที่ใช้ร่วมกันข้ามทุก session
 * ครอบ bounded context เดียว: workspace + records (ยืดหยุ่น) + transactions (การเงิน)
 * AI แตะข้อมูลผ่าน tools (ดู src/infrastructure/ai/workspaceTools.ts)
 * Following Clean Architecture - this is in the Application layer
 */

// ---- Workspace ----

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
}

// ---- Record (ข้อมูลทั่วไป เก็บเป็น JSON ตาม kind) ----

export interface WorkspaceRecord {
  id: string;
  workspaceId: string;
  /** ประเภทข้อมูลที่ AI ตั้งเอง เช่น "company-info", "contact", "note" */
  kind: string;
  /** เนื้อหาแบบยืดหยุ่น (object ใดก็ได้) */
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AddRecordData {
  kind: string;
  data: Record<string, unknown>;
}

export interface RecordQuery {
  kind?: string;
  /** ค้นข้อความใน data (substring, case-insensitive) */
  query?: string;
  limit?: number;
}

// ---- Transaction (การเงิน) ----

export type TransactionDirection = "income" | "expense";

export interface WorkspaceTransaction {
  id: string;
  workspaceId: string;
  /** "YYYY-MM-DD" */
  date: string;
  direction: TransactionDirection;
  amount: number;
  category?: string;
  note?: string;
  createdAt: string;
}

export interface AddTransactionData {
  date: string;
  direction: TransactionDirection;
  amount: number;
  category?: string;
  note?: string;
}

export interface TransactionQuery {
  from?: string;
  to?: string;
  direction?: TransactionDirection;
  category?: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  net: number;
  byCategory: Array<{
    category: string;
    direction: TransactionDirection;
    total: number;
  }>;
}

// ---- Repository contract ----

export interface IWorkspaceRepository {
  // workspaces
  listWorkspaces(): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | null>;
  /** resolve ด้วย id หรือชื่อ (AI มักอ้างด้วยชื่อ) */
  getWorkspaceByIdOrName(idOrName: string): Promise<Workspace | null>;
  createWorkspace(data: CreateWorkspaceData): Promise<Workspace>;
  updateWorkspace(id: string, data: UpdateWorkspaceData): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<boolean>;

  // records
  listRecords(workspaceId: string, query?: RecordQuery): Promise<WorkspaceRecord[]>;
  addRecord(workspaceId: string, data: AddRecordData): Promise<WorkspaceRecord>;
  updateRecord(
    recordId: string,
    data: Partial<AddRecordData>
  ): Promise<WorkspaceRecord>;
  deleteRecord(recordId: string): Promise<boolean>;

  // transactions
  addTransaction(
    workspaceId: string,
    data: AddTransactionData
  ): Promise<WorkspaceTransaction>;
  listTransactions(
    workspaceId: string,
    query?: TransactionQuery
  ): Promise<WorkspaceTransaction[]>;
  summarizeFinance(
    workspaceId: string,
    from?: string,
    to?: string
  ): Promise<FinanceSummary>;
}
