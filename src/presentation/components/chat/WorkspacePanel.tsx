"use client";

import type { Workspace } from "@/src/application/repositories/IWorkspaceRepository";
import type { WorkspaceDetail } from "@/src/presentation/presenters/chat/useChatPresenter";

interface WorkspacePanelProps {
  workspaces: Workspace[];
  /** รายละเอียดที่เปิดดูอยู่ — null = แสดงรายการ workspace */
  detail: WorkspaceDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onCloseDetail: () => void;
}

/**
 * WorkspacePanel — modal ดู/สร้าง/ลบ workspace + ดูข้อมูลที่ AI เก็บ
 * ✅ JSX ล้วน — form ใช้ uncontrolled (FormData) ไม่มี business logic
 */
export function WorkspacePanel({
  workspaces,
  detail,
  isLoading,
  onClose,
  onCreate,
  onDelete,
  onOpenDetail,
  onCloseDetail,
}: WorkspacePanelProps) {
  const detailWorkspace = detail
    ? workspaces.find((w) => w.id === detail.workspaceId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">
            🗂️ {detail ? detailWorkspace?.name ?? "Workspace" : "Workspace"}
          </h2>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!detail ? (
            <>
              <p className="text-xs text-muted-foreground">
                คลังข้อมูลที่ใช้ร่วมกันข้ามทุกแชต — AI อ่าน/บันทึก/แก้/ลบ
                ข้อมูลที่นี่เองได้ผ่านการสนทนา
              </p>

              {workspaces.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  ยังไม่มี workspace — สร้างใหม่ด้านล่าง
                  หรือบอก AI ในแชตให้สร้างให้ก็ได้
                </p>
              )}

              <ul className="space-y-2">
                {workspaces.map((ws) => (
                  <li
                    key={ws.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background p-3"
                  >
                    <button
                      onClick={() => onOpenDetail(ws.id)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium">{ws.name}</div>
                      {ws.description && (
                        <div className="text-xs text-muted-foreground">
                          {ws.description}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(ws.id)}
                      aria-label="ลบ workspace"
                      className="px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    >
                      ลบ
                    </button>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  const name = String(data.get("name") ?? "");
                  const description = String(data.get("description") ?? "");
                  onCreate(name, description || undefined);
                  form.reset();
                }}
                className="space-y-2 pt-2 border-t border-border"
              >
                <input
                  name="name"
                  required
                  placeholder="ชื่อ workspace ใหม่ เช่น ai agent academy"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  name="description"
                  placeholder="คำอธิบาย (ไม่บังคับ)"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-brand-600 transition-colors"
                >
                  + สร้าง workspace
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={onCloseDetail}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← กลับไปรายการ
              </button>

              {/* สรุปการเงิน */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <FinanceStat
                  label="รายรับ"
                  value={detail.summary.income}
                  className="text-emerald-500"
                />
                <FinanceStat
                  label="รายจ่าย"
                  value={detail.summary.expense}
                  className="text-red-500"
                />
                <FinanceStat
                  label="คงเหลือ"
                  value={detail.summary.net}
                  className={
                    detail.summary.net >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                />
              </div>

              {/* transactions */}
              <section>
                <h3 className="text-sm font-medium mb-1.5">
                  รายการเงิน ({detail.transactions.length})
                </h3>
                {detail.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">ยังไม่มีรายการ</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.transactions.map((tx) => (
                      <li
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {tx.date}
                          {tx.category ? ` · ${tx.category}` : ""}
                          {tx.note ? ` · ${tx.note}` : ""}
                        </span>
                        <span
                          className={
                            tx.direction === "income"
                              ? "text-emerald-500"
                              : "text-red-500"
                          }
                        >
                          {tx.direction === "income" ? "+" : "-"}
                          {formatAmount(tx.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* records */}
              <section>
                <h3 className="text-sm font-medium mb-1.5">
                  ข้อมูลอื่น ({detail.records.length})
                </h3>
                {detail.records.length === 0 ? (
                  <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.records.map((rec) => (
                      <li
                        key={rec.id}
                        className="rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <div className="text-xs text-muted-foreground mb-0.5">
                          {rec.kind}
                        </div>
                        <pre className="whitespace-pre-wrap wrap-break-word text-xs leading-relaxed">
                          {JSON.stringify(rec.data, null, 2)}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {detailWorkspace && (
                <button
                  onClick={() => onDelete(detailWorkspace.id)}
                  className="w-full px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-colors"
                >
                  ลบ workspace นี้
                </button>
              )}
            </>
          )}

          {isLoading && (
            <p className="text-xs text-muted-foreground text-center">
              กำลังโหลด…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FinanceStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${className ?? ""}`}>
        {formatAmount(value)}
      </div>
    </div>
  );
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}
