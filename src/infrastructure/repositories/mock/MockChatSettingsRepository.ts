/**
 * MockChatSettingsRepository
 * Mock implementation for development, testing, and SSR
 * Following Clean Architecture - this is in the Infrastructure layer
 */

import type { IChatSettingsRepository } from "@/src/application/repositories/IChatSettingsRepository";
import {
  ChatSettings,
  DEFAULT_CHAT_SETTINGS,
  normalizeChatSettings,
} from "@/src/application/chat/settings";

export class MockChatSettingsRepository implements IChatSettingsRepository {
  private settings: ChatSettings = { ...DEFAULT_CHAT_SETTINGS };

  async get(): Promise<ChatSettings> {
    return { ...this.settings };
  }

  async save(settings: ChatSettings): Promise<ChatSettings> {
    this.settings = normalizeChatSettings(settings);
    return { ...this.settings };
  }
}
