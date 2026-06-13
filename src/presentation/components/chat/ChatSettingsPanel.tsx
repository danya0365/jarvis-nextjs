"use client";

import type {
  ChatSettings,
  HistoryMode,
} from "@/src/application/chat/settings";
import type { ModelGroup } from "@/src/application/ai/models";

interface ChatSettingsPanelProps {
  settings: ChatSettings;
  /** model จัดกลุ่มตามค่าย — ใช้ render dropdown โมเดลสำหรับสรุป */
  modelGroups: ModelGroup[];
  onClose: () => void;
  onUpdate: (partial: Partial<ChatSettings>) => void;
}

/**
 * ChatSettingsPanel — modal ตั้งค่าการบริหาร token (ประหยัดค่าใช้จ่าย)
 * ✅ JSX ล้วน — ค่าและ action มาจาก hook ผ่าน props
 */
export function ChatSettingsPanel({
  settings,
  modelGroups,
  onClose,
  onUpdate,
}: ChatSettingsPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">⚙️ บริหาร Token</h2>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* History mode */}
          <div>
            <label
              htmlFor="history-mode"
              className="block text-sm font-medium mb-1.5"
            >
              ประวัติที่ส่งให้ AI
            </label>
            <select
              id="history-mode"
              value={settings.historyMode}
              onChange={(e) =>
                onUpdate({ historyMode: e.target.value as HistoryMode })
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="summary">
                สรุปความจำ (แนะนำ — ประหยัดแต่ยังจำเรื่องสำคัญ)
              </option>
              <option value="recent">
                เฉพาะข้อความล่าสุด (ประหยัด แต่ลืมเรื่องเก่า)
              </option>
              <option value="all">ทั้งหมด (จำบริบทครบ แต่แพงขึ้นเรื่อยๆ)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">
              ประวัติในเครื่องยังเก็บครบทุกข้อความ —
              ตั้งค่านี้มีผลเฉพาะสิ่งที่ส่งให้ AI ต่อเทิร์น
            </p>
          </div>

          {/* Summary model — แสดงเฉพาะโหมดสรุป */}
          {settings.historyMode === "summary" && (
            <div>
              <label
                htmlFor="summary-model"
                className="block text-sm font-medium mb-1.5"
              >
                โมเดลสำหรับสรุปความจำ
              </label>
              <select
                id="summary-model"
                value={settings.summaryModel}
                onChange={(e) => onUpdate({ summaryModel: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {modelGroups.map((group) => (
                  <optgroup key={group.vendor} label={group.vendor}>
                    {group.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                การสรุปก็มีค่าใช้จ่าย — แนะนำเลือกโมเดลถูกๆ
                (ค่าเริ่มต้นเลือกโมเดลที่ถูกที่สุดให้แล้ว)
              </p>
            </div>
          )}

          {/* Max history messages */}
          <div>
            <label
              htmlFor="max-history"
              className="block text-sm font-medium mb-1.5"
            >
              จำนวนข้อความล่าสุดที่ส่ง
            </label>
            <input
              id="max-history"
              type="number"
              min={1}
              max={100}
              value={settings.maxHistoryMessages}
              disabled={settings.historyMode === "all"}
              onChange={(e) =>
                onUpdate({ maxHistoryMessages: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              ยิ่งน้อยยิ่งประหยัด แต่ AI จะจำบทสนทนาเก่าได้สั้นลง
            </p>
          </div>

          {/* Max response tokens */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
              <input
                type="checkbox"
                checked={settings.maxResponseTokens !== null}
                onChange={(e) =>
                  onUpdate({
                    maxResponseTokens: e.target.checked ? 1024 : null,
                  })
                }
                className="accent-[var(--primary)]"
              />
              จำกัดความยาวคำตอบ (max_tokens)
            </label>
            {settings.maxResponseTokens !== null && (
              <input
                type="number"
                min={16}
                max={32768}
                step={128}
                value={settings.maxResponseTokens}
                onChange={(e) =>
                  onUpdate({ maxResponseTokens: Number(e.target.value) })
                }
                aria-label="จำนวน token สูงสุดของคำตอบ"
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              คุมค่าใช้จ่าย output tokens — คำตอบที่ยาวเกินจะถูกตัด
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
