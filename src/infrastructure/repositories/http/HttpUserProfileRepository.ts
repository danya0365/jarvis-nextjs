/**
 * HttpUserProfileRepository
 * Implementation of IUserProfileRepository ที่คุยกับ Turso ผ่าน /api/user-profile
 * Following Clean Architecture - this is in the Infrastructure layer (client adapter)
 * ใช้โดย UI (UserProfilePanel) — agent loop ฝั่ง server ใช้ TursoUserProfileRepository ตรง
 */

import {
  IUserProfileRepository,
  UserProfile,
} from "@/src/application/repositories/IUserProfileRepository";

const BASE = "/api/user-profile";
const EMPTY: UserProfile = { profile: "", updatedAt: "" };

export class HttpUserProfileRepository implements IUserProfileRepository {
  async get(): Promise<UserProfile> {
    try {
      const res = await fetch(BASE, { cache: "no-store" });
      if (!res.ok) return { ...EMPTY };
      return (await res.json()) as UserProfile;
    } catch {
      return { ...EMPTY };
    }
  }

  async save(profile: string): Promise<UserProfile> {
    const res = await fetch(BASE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) throw new Error("บันทึกโปรไฟล์ไม่สำเร็จ");
    return (await res.json()) as UserProfile;
  }
}
