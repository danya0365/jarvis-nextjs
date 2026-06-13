/**
 * TursoChatSettingsRepository
 * Implementation of IChatSettingsRepository using Turso (libsql SQLite)
 * Following Clean Architecture - this is in the Infrastructure layer
 * ⚠️ server-side เท่านั้น — settings เป็น singleton (แถวเดียว id = 'singleton')
 */

import "server-only";
import { IChatSettingsRepository } from "@/src/application/repositories/IChatSettingsRepository";
import {
  ChatSettings,
  DEFAULT_CHAT_SETTINGS,
  normalizeChatSettings,
} from "@/src/application/chat/settings";
import { getTursoClient, ensureSchema } from "@/src/infrastructure/db/turso";

const SINGLETON_ID = "singleton";

export class TursoChatSettingsRepository implements IChatSettingsRepository {
  async get(): Promise<ChatSettings> {
    await ensureSchema();
    const { rows } = await getTursoClient().execute({
      sql: "SELECT * FROM chat_settings WHERE id = ? LIMIT 1",
      args: [SINGLETON_ID],
    });

    if (rows.length === 0) return { ...DEFAULT_CHAT_SETTINGS };

    const row = rows[0];
    return normalizeChatSettings({
      historyMode: row.history_mode as ChatSettings["historyMode"],
      maxHistoryMessages: Number(row.max_history_messages),
      maxResponseTokens:
        row.max_response_tokens === null
          ? null
          : Number(row.max_response_tokens),
      summaryModel: String(row.summary_model),
    });
  }

  async save(settings: ChatSettings): Promise<ChatSettings> {
    await ensureSchema();
    const normalized = normalizeChatSettings(settings);

    await getTursoClient().execute({
      sql: `INSERT INTO chat_settings
              (id, history_mode, max_history_messages, max_response_tokens, summary_model)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              history_mode = excluded.history_mode,
              max_history_messages = excluded.max_history_messages,
              max_response_tokens = excluded.max_response_tokens,
              summary_model = excluded.summary_model`,
      args: [
        SINGLETON_ID,
        normalized.historyMode,
        normalized.maxHistoryMessages,
        normalized.maxResponseTokens,
        normalized.summaryModel,
      ],
    });

    return normalized;
  }
}
