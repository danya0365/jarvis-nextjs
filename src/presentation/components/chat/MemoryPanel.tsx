"use client";

interface MemoryPanelProps {
  /** บันทึกความจำปัจจุบันของ session (undefined/ว่าง = ยังไม่มี) */
  memory: string | undefined;
  /** จำนวนข้อความที่ถูกพับเข้าความจำแล้ว */
  foldedCount: number;
  /** จำนวนข้อความทั้งหมดใน session */
  totalCount: number;
  /** true = กำลังสรุป (ปิดปุ่มกันกดซ้ำ) */
  isSummarizing: boolean;
  onClose: () => void;
  onSummarize: () => void;
  onClear: () => void;
}

/**
 * MemoryPanel — modal ดู/สรุป/ล้าง "ความจำ" ของ session
 * ✅ JSX ล้วน — ข้อมูลและ action มาจาก hook ผ่าน props
 */
export function MemoryPanel({
  memory,
  foldedCount,
  totalCount,
  isSummarizing,
  onClose,
  onSummarize,
  onClear,
}: MemoryPanelProps) {
  const hasMemory = Boolean(memory && memory.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">🧠 ความจำของแชทนี้</h2>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            ระบบสรุปข้อความเก่าเป็นบันทึกความจำ แล้วแนบให้ AI ทุกครั้ง —
            ส่ง token น้อยลงแต่ AI ยังจำเรื่องสำคัญในแชตนี้ได้
          </p>

          {hasMemory ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                {memory}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              ยังไม่มีความจำ — เมื่อคุยยาวขึ้น
              ระบบจะสรุปข้อความเก่าให้อัตโนมัติ หรือกด “สรุปความจำตอนนี้” ได้เลย
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            พับเข้าความจำแล้ว {foldedCount}/{totalCount} ข้อความ
          </p>

          <div className="flex gap-2">
            <button
              onClick={onSummarize}
              disabled={isSummarizing}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSummarizing ? "กำลังสรุป..." : "🧠 สรุปความจำตอนนี้"}
            </button>
            {hasMemory && (
              <button
                onClick={onClear}
                disabled={isSummarizing}
                className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-colors disabled:opacity-50"
              >
                ล้างความจำ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
