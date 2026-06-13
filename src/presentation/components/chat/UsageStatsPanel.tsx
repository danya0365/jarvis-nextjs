"use client";

import type {
  UsageSummary,
  UsageTotals,
} from "@/src/presentation/presenters/chat/ChatPresenter";

interface UsageStatsPanelProps {
  summary: UsageSummary;
  onClose: () => void;
  onClear: () => void;
  formatTokens: (tokens: number) => string;
  formatCostUsd: (costUsd: number | null) => string;
}

/**
 * UsageStatsPanel — modal สรุปการใช้งาน token/ค่าใช้จ่ายสะสม
 * ✅ JSX ล้วน — ข้อมูลและ formatter มาจาก hook ผ่าน props
 */
export function UsageStatsPanel({
  summary,
  onClose,
  onClear,
  formatTokens,
  formatCostUsd,
}: UsageStatsPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">📊 การใช้งาน Token</h2>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* สรุปวันนี้ / ทั้งหมด */}
          <div className="grid grid-cols-2 gap-3">
            <TotalsCard
              title="วันนี้"
              totals={summary.today}
              formatTokens={formatTokens}
              formatCostUsd={formatCostUsd}
            />
            <TotalsCard
              title="ทั้งหมด"
              totals={summary.allTime}
              formatTokens={formatTokens}
              formatCostUsd={formatCostUsd}
            />
          </div>

          {/* แยกตาม model */}
          {summary.byModel.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium mb-2">แยกตามโมเดล</h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="text-left font-medium px-3 py-2">
                        โมเดล
                      </th>
                      <th className="text-right font-medium px-3 py-2">
                        ครั้ง
                      </th>
                      <th className="text-right font-medium px-3 py-2">
                        Input
                      </th>
                      <th className="text-right font-medium px-3 py-2">
                        Output
                      </th>
                      <th className="text-right font-medium px-3 py-2">
                        ค่าใช้จ่าย
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byModel.map((row) => (
                      <tr key={row.model} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">
                          {row.label}
                          {row.hasEstimated && (
                            <span
                              className="text-muted-foreground"
                              title="มีรายการที่เป็นค่าประมาณ"
                            >
                              {" "}
                              ~
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {row.calls}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatTokens(row.promptTokens)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatTokens(row.completionTokens)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCostUsd(row.costUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              ยังไม่มีข้อมูลการใช้งาน — เริ่มแชตแล้วสถิติจะแสดงที่นี่
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            * ราคาเป็นค่าประมาณจากตารางราคาในแอป (USD) — เครื่องหมาย ~
            หมายถึงมีรายการที่ประมาณจำนวน token ฝั่งแอป
            ยอดนี้สะสมแยกจากแชต ลบแชตแล้วยอดไม่หาย
          </p>

          {summary.allTime.calls > 0 && (
            <button
              onClick={onClear}
              className="w-full px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-colors"
            >
              🗑️ ล้างสถิติทั้งหมด
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TotalsCardProps {
  title: string;
  totals: UsageTotals;
  formatTokens: (tokens: number) => string;
  formatCostUsd: (costUsd: number | null) => string;
}

function TotalsCard({
  title,
  totals,
  formatTokens,
  formatCostUsd,
}: TotalsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-xl font-semibold">
        {totals.hasEstimated && <span title="มีรายการค่าประมาณ">~</span>}
        {formatCostUsd(totals.costUsd)}
      </p>
      <p className="text-xs text-muted-foreground mt-1.5">
        {totals.calls} ครั้ง · ↓{formatTokens(totals.promptTokens)} ↑
        {formatTokens(totals.completionTokens)}
      </p>
    </div>
  );
}
