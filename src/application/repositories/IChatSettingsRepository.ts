/**
 * IChatSettingsRepository
 * Repository interface for ChatSettings persistence
 * Following Clean Architecture - this is in the Application layer
 */

import type { ChatSettings } from "@/src/application/chat/settings";

export interface IChatSettingsRepository {
  /**
   * Get current settings (คืนค่า default ถ้ายังไม่เคยบันทึก)
   */
  get(): Promise<ChatSettings>;

  /**
   * Save settings (แทนที่ทั้ง object)
   */
  save(settings: ChatSettings): Promise<ChatSettings>;
}
