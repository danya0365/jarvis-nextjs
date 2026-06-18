/**
 * IUserProfileRepository
 * Repository interface for the user profile — ข้อมูลถาวรเกี่ยวกับผู้ใช้ ข้ามทุก session
 * เป็น singleton (text เดียว) แนบเป็น context ชั้นที่ 2 ให้ AI ทุกเทิร์น
 * Following Clean Architecture - this is in the Application layer
 */

export interface UserProfile {
  /** โปรไฟล์ผู้ใช้แบบ text กระชับ (ชื่อ/บทบาท/ความชอบ/โปรเจกต์ ฯลฯ) */
  profile: string;
  updatedAt: string;
}

export interface IUserProfileRepository {
  /** คืน profile ปัจจุบัน (คืน profile ว่างถ้ายังไม่เคยบันทึก) */
  get(): Promise<UserProfile>;
  /** บันทึก profile (แทนที่ทั้งก้อน) */
  save(profile: string): Promise<UserProfile>;
}
