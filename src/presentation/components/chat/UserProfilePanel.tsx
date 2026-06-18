"use client";

import type { UserProfile } from "@/src/application/repositories/IUserProfileRepository";

interface UserProfilePanelProps {
  profile: UserProfile | null;
  onClose: () => void;
  onSave: (profile: string) => void;
}

/**
 * UserProfilePanel — modal ดู/แก้ "โปรไฟล์ผู้ใช้" (ข้ามทุก session)
 * ✅ JSX ล้วน — textarea uncontrolled (defaultValue + FormData), key รีเซ็ตเมื่อ profile โหลด/เปลี่ยน
 */
export function UserProfilePanel({
  profile,
  onClose,
  onSave,
}: UserProfilePanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">👤 โปรไฟล์ผู้ใช้</h2>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            onSave(String(data.get("profile") ?? ""));
          }}
          className="p-5 space-y-4"
        >
          <p className="text-xs text-muted-foreground">
            ข้อมูลถาวรเกี่ยวกับคุณ (ชื่อ บทบาท ความชอบ โปรเจกต์) —
            แนบให้ AI ทุกบทสนทนาเพื่อให้ตอบได้ตรงตัวคุณ
            โดยไม่ต้องเล่าซ้ำ AI จะอัปเดตให้อัตโนมัติเมื่อรู้จักคุณมากขึ้น
            หรือคุณแก้เองได้ที่นี่
          </p>

          <textarea
            key={profile?.updatedAt ?? "empty"}
            name="profile"
            defaultValue={profile?.profile ?? ""}
            rows={8}
            placeholder="เช่น: ชื่อมารดี เป็นเจ้าของ AI Agent Academy ชอบคำตอบสั้นกระชับ ใช้ภาษาไทย"
            className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />

          {profile?.updatedAt && (
            <p className="text-xs text-muted-foreground">
              อัปเดตล่าสุด:{" "}
              {new Date(profile.updatedAt).toLocaleString("th-TH")}
            </p>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            บันทึกโปรไฟล์
          </button>
        </form>
      </div>
    </div>
  );
}
