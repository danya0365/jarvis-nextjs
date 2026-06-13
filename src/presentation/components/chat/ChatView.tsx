"use client";

import { ChatViewModel } from "@/src/presentation/presenters/chat/ChatPresenter";
import { useChatPresenter } from "@/src/presentation/presenters/chat/useChatPresenter";
import { ThemeToggle } from "@/src/presentation/components/shared/ThemeToggle";
import { UsageStatsPanel } from "@/src/presentation/components/chat/UsageStatsPanel";
import { ChatSettingsPanel } from "@/src/presentation/components/chat/ChatSettingsPanel";
import { MemoryPanel } from "@/src/presentation/components/chat/MemoryPanel";

interface ChatViewProps {
  initialViewModel?: ChatViewModel;
}

export function ChatView({ initialViewModel }: ChatViewProps) {
  // ✅ EVERYTHING (state, actions, helpers, refs) comes from this hook
  const [state, actions] = useChatPresenter(initialViewModel);

  const viewModel = state.viewModel;

  // Loading state — รอ hydrate จาก localStorage
  if (state.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลดข้อมูลแชท...</p>
        </div>
      </div>
    );
  }

  // Error state — โหลดข้อมูลไม่ได้เลย
  if (state.error && !viewModel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-foreground font-medium mb-2">เกิดข้อผิดพลาด</p>
          <p className="text-muted-foreground mb-4">{state.error}</p>
          <button
            onClick={actions.loadData}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  if (!viewModel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-muted-foreground">ยังไม่มีข้อมูลแชท</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {state.isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={actions.toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          state.isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static z-30 h-full w-72 shrink-0 flex flex-col bg-card border-r border-border transition-transform duration-200`}
      >
        <div className="p-4 border-b border-border">
          <button
            onClick={actions.createSession}
            className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-brand-600 transition-colors font-medium"
          >
            + แชทใหม่
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {viewModel.sessions.length === 0 && (
            <p className="text-muted-foreground text-sm text-center mt-8 px-4">
              ยังไม่มีแชท — กดปุ่ม “+ แชทใหม่” เพื่อเริ่มคุยกับ AI
            </p>
          )}

          {viewModel.sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-1 rounded-lg mb-1 ${
                session.id === state.activeSession?.id
                  ? "bg-brand-50 text-brand-700"
                  : "hover:bg-muted"
              }`}
            >
              {state.renamingSessionId === session.id ? (
                <input
                  autoFocus
                  value={state.renameInput}
                  onChange={(e) => actions.setRenameInput(e.target.value)}
                  onBlur={actions.commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") actions.commitRename();
                    if (e.key === "Escape") actions.cancelRename();
                  }}
                  className="flex-1 m-1 px-2 py-1.5 text-sm rounded-md bg-card border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <>
                  <button
                    onClick={() => actions.selectSession(session.id)}
                    className="flex-1 text-left px-3 py-2.5 min-w-0"
                  >
                    <span className="block text-sm font-medium truncate">
                      {session.title}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {session.messages.length > 0
                        ? `${session.messages.length} ข้อความ`
                        : "ยังไม่มีข้อความ"}
                    </span>
                  </button>
                  <button
                    onClick={() => actions.startRename(session.id, session.title)}
                    title="เปลี่ยนชื่อ"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-foreground transition-opacity"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => actions.deleteSession(session.id)}
                    title="ลบแชท"
                    className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-muted-foreground hover:text-red-500 transition-opacity"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={actions.toggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            aria-label="เปิด/ปิดรายการแชท"
          >
            ☰
          </button>

          <h1 className="flex-1 text-base font-semibold truncate">
            {state.activeSession?.title ?? "แชท AI"}
          </h1>

          {/* ยอด token/ค่าใช้จ่ายรวมของ session นี้ */}
          {state.sessionUsage.hasUsage && (
            <span
              className="hidden lg:block text-xs text-muted-foreground whitespace-nowrap"
              title="ยอดรวมของ session นี้ (input/output tokens · ค่าใช้จ่ายโดยประมาณ)"
            >
              {state.sessionUsage.hasEstimated && "~"}↓
              {actions.formatTokens(state.sessionUsage.promptTokens)} ↑
              {actions.formatTokens(state.sessionUsage.completionTokens)}
              {" · "}
              {actions.formatCostUsd(state.sessionUsage.costUsd)}
            </span>
          )}

          <select
            value={state.activeSession?.model ?? viewModel.defaultModel}
            onChange={(e) => actions.setModel(e.target.value)}
            disabled={!state.activeSession || state.isStreaming}
            title="เลือกโมเดล AI"
            className="max-w-44 sm:max-w-60 px-3 py-2 text-sm rounded-lg bg-card border border-input focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {viewModel.modelGroups.map((group) => (
              <optgroup key={group.vendor} label={group.vendor}>
                {group.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            onClick={actions.toggleMemoryPanel}
            title="ความจำของแชทนี้"
            aria-label="เปิดความจำของแชท"
            className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
          >
            🧠
          </button>

          <button
            onClick={actions.toggleStatsPanel}
            title="การใช้งาน token"
            aria-label="เปิดสรุปการใช้งาน token"
            className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
          >
            📊
          </button>

          <button
            onClick={actions.toggleSettingsPanel}
            title="ตั้งค่าบริหาร token"
            aria-label="เปิดตั้งค่าบริหาร token"
            className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
          >
            ⚙️
          </button>

          <ThemeToggle />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {!state.activeSession ||
            (state.activeSession.messages.length === 0 && !state.isStreaming) ? (
              <div className="text-center mt-24">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-foreground font-medium mb-2">
                  เริ่มคุยกับ AI ได้เลย
                </p>
                <p className="text-muted-foreground text-sm">
                  พิมพ์ข้อความด้านล่าง — AI จะจดจำบทสนทนาต่อเนื่องใน session นี้
                </p>
              </div>
            ) : (
              <>
                {state.activeSession.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1.5 ${
                          message.role === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {actions.formatTime(message.createdAt)}
                        {actions.formatMessageUsage(message) && (
                          <span
                            className="ml-2"
                            title="token ที่ใช้ (input/output) · ค่าใช้จ่ายโดยประมาณ"
                          >
                            {actions.formatMessageUsage(message)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Assistant message ระหว่าง streaming */}
                {state.isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-border">
                      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                        {state.streamingText ||
                          (state.isSummarizing
                            ? "🧠 กำลังสรุปความจำเก่า..."
                            : "กำลังคิด...")}
                        <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse align-text-bottom" />
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div id={state.messagesEndId} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-card px-4 py-3">
          {/* Context indicator — เห็นก่อนส่งว่ากำลังจะจ่ายเท่าไหร่ */}
          {state.contextPreview.totalCount > 0 && (
            <div className="max-w-3xl mx-auto mb-1.5">
              <p
                className="text-xs text-muted-foreground"
                title="จำนวนข้อความที่จะถูกส่งให้ AI ตามการตั้งค่าบริหาร token (⚙️)"
              >
                {state.contextPreview.hasMemory && <span>🧠 ความจำ + </span>}
                จะส่ง {state.contextPreview.sendCount}/
                {state.contextPreview.totalCount} ข้อความ (~
                {actions.formatTokens(state.contextPreview.estimatedTokens)}{" "}
                tokens)
                {state.contextPreview.sendCount <
                  state.contextPreview.totalCount &&
                  (state.contextPreview.hasMemory ? (
                    <span> · สรุปข้อความเก่าเป็นความจำเพื่อประหยัด token</span>
                  ) : (
                    <span> · ตัดข้อความเก่าออกเพื่อประหยัด token</span>
                  ))}
              </p>
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea
              value={state.input}
              onChange={(e) => actions.setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  actions.sendMessage();
                }
              }}
              placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
              rows={1}
              className="flex-1 resize-none px-4 py-3 text-sm rounded-xl bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring max-h-40"
            />

            {state.isStreaming ? (
              <button
                onClick={actions.stopStreaming}
                className="px-4 py-3 rounded-xl bg-surface-200 text-foreground hover:bg-surface-300 transition-colors text-sm font-medium"
              >
                ⏹ หยุด
              </button>
            ) : (
              <button
                onClick={actions.sendMessage}
                disabled={!state.input.trim()}
                className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-brand-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ส่ง
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Usage stats panel */}
      {state.isStatsPanelOpen && (
        <UsageStatsPanel
          summary={viewModel.usageSummary}
          onClose={actions.toggleStatsPanel}
          onClear={actions.clearUsageStats}
          formatTokens={actions.formatTokens}
          formatCostUsd={actions.formatCostUsd}
        />
      )}

      {/* Token management settings panel */}
      {state.isSettingsPanelOpen && (
        <ChatSettingsPanel
          settings={viewModel.settings}
          modelGroups={viewModel.modelGroups}
          onClose={actions.toggleSettingsPanel}
          onUpdate={actions.updateSettings}
        />
      )}

      {/* Memory panel */}
      {state.isMemoryPanelOpen && (
        <MemoryPanel
          memory={state.activeSession?.memory}
          foldedCount={state.activeSession?.memoryUpToCount ?? 0}
          totalCount={state.activeSession?.messages.length ?? 0}
          isSummarizing={state.isSummarizing}
          onClose={actions.toggleMemoryPanel}
          onSummarize={actions.summarizeNow}
          onClear={actions.clearMemory}
        />
      )}

      {/* Error Toast */}
      {state.error && viewModel && (
        <div className="fixed bottom-4 right-4 z-40 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            <span className="text-sm">{state.error}</span>
            <button
              onClick={() => actions.setError(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
