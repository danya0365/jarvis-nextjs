"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatViewModel, ChatPresenter } from "./ChatPresenter";
import { createClientChatPresenter } from "./ChatPresenterClientFactory";
import type { ChatSession } from "@/src/application/repositories/IChatSessionRepository";

const MESSAGES_END_ID = "chat-messages-end";

export interface ChatPresenterState {
  viewModel: ChatViewModel | null;
  activeSession: ChatSession | null;
  loading: boolean;
  error: string | null;
  isStreaming: boolean;
  streamingText: string;
  input: string;
  isSidebarOpen: boolean;
  renamingSessionId: string | null;
  renameInput: string;
  /** id ของ sentinel div ท้าย message list — hook ใช้ scroll อัตโนมัติ */
  messagesEndId: string;
}

export interface ChatPresenterActions {
  loadData: () => Promise<void>;
  selectSession: (id: string) => void;
  createSession: () => Promise<void>;
  startRename: (id: string, currentTitle: string) => void;
  setRenameInput: (value: string) => void;
  commitRename: () => Promise<void>;
  cancelRename: () => void;
  deleteSession: (id: string) => Promise<void>;
  setModel: (model: string) => Promise<void>;
  setInput: (value: string) => void;
  sendMessage: () => Promise<void>;
  stopStreaming: () => void;
  toggleSidebar: () => void;
  setError: (error: string | null) => void;
  formatTime: (iso: string) => string;
}

/**
 * Custom hook for Chat presenter
 * Provides state management and actions for Chat operations
 */
export function useChatPresenter(
  initialViewModel?: ChatViewModel,
  presenterOverride?: ChatPresenter
): [ChatPresenterState, ChatPresenterActions] {
  // ✅ Create presenter inside hook with useMemo
  // Accept override for easier testing (Dependency Injection)
  const presenter = useMemo(
    () => presenterOverride ?? createClientChatPresenter(),
    [presenterOverride]
  );

  // ✅ Track mounted state for memory leak protection
  const isMountedRef = useRef(true);

  // ✅ AbortController ref for canceling streaming requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const [viewModel, setViewModel] = useState<ChatViewModel | null>(
    initialViewModel || null
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  // ⚠️ เริ่ม loading = true เสมอ (ต่างจาก template):
  // initialViewModel จาก server เป็นค่าว่างเสมอ เพราะข้อมูลจริงอยู่ localStorage
  // จึงต้อง hydrate ฝั่ง client ก่อนค่อย render ส่วนที่ขึ้นกับ session
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(
    null
  );
  const [renameInput, setRenameInputState] = useState("");

  const activeSession = useMemo(() => {
    if (!viewModel || !activeSessionId) return null;
    return (
      viewModel.sessions.find((session) => session.id === activeSessionId) ||
      null
    );
  }, [viewModel, activeSessionId]);

  /**
   * Load sessions from localStorage repository
   * ⚠️ ห้ามเรียก setState แบบ synchronous ที่ต้นฟังก์ชัน —
   * ฟังก์ชันนี้ถูกเรียกจาก effect ตอน mount (กฎ react-hooks/set-state-in-effect)
   */
  const loadData = useCallback(async () => {
    try {
      const newViewModel = await presenter.getViewModel();
      if (isMountedRef.current) {
        setViewModel(newViewModel);
        setError(null);
        setActiveSessionId(
          (current) =>
            current ?? newViewModel.sessions[0]?.id ?? null
        );
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error loading chat data:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [presenter]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false);
    setError(null);
  }, []);

  const createSession = useCallback(async () => {
    setError(null);

    try {
      const newSession = await presenter.createSession();
      await loadData();
      if (isMountedRef.current) {
        setActiveSessionId(newSession.id);
        setIsSidebarOpen(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error creating chat session:", err);
      }
    }
  }, [loadData, presenter]);

  const startRename = useCallback((id: string, currentTitle: string) => {
    setRenamingSessionId(id);
    setRenameInputState(currentTitle);
    setError(null);
  }, []);

  const setRenameInput = useCallback((value: string) => {
    setRenameInputState(value);
  }, []);

  const commitRename = useCallback(async () => {
    if (!renamingSessionId) return;

    const title = renameInput.trim();
    if (!title) {
      setRenamingSessionId(null);
      return;
    }

    try {
      await presenter.renameSession(renamingSessionId, title);
      await loadData();
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error renaming chat session:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setRenamingSessionId(null);
        setRenameInputState("");
      }
    }
  }, [loadData, presenter, renameInput, renamingSessionId]);

  const cancelRename = useCallback(() => {
    setRenamingSessionId(null);
    setRenameInputState("");
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      // confirm อยู่ใน hook เพื่อให้ View เป็น JSX ล้วน
      if (!window.confirm("ต้องการลบแชทนี้ใช่ไหม?")) return;

      setError(null);

      try {
        await presenter.deleteSession(id);
        const newViewModel = await presenter.getViewModel();
        if (isMountedRef.current) {
          setViewModel(newViewModel);
          setActiveSessionId((current) =>
            current === id ? newViewModel.sessions[0]?.id ?? null : current
          );
        }
      } catch (err) {
        if (isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          console.error("Error deleting chat session:", err);
        }
      }
    },
    [presenter]
  );

  const setModel = useCallback(
    async (model: string) => {
      if (!activeSessionId) return;

      try {
        await presenter.setSessionModel(activeSessionId, model);
        await loadData();
      } catch (err) {
        if (isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          console.error("Error setting session model:", err);
        }
      }
    },
    [activeSessionId, loadData, presenter]
  );

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setError(null);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    // session ใหม่อัตโนมัติถ้ายังไม่มี session ที่เลือก
    let sessionId = activeSessionId;

    try {
      if (!sessionId) {
        const newSession = await presenter.createSession();
        sessionId = newSession.id;
        if (isMountedRef.current) {
          setActiveSessionId(sessionId);
        }
      }

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      // refresh view model ให้เห็น user message ที่เพิ่ง persist ระหว่างรอ stream
      const refreshAfterUserMessage = async () => {
        const vm = await presenter.getViewModel();
        if (isMountedRef.current) setViewModel(vm);
      };

      const sendPromise = presenter.sendMessage({
        sessionId,
        content,
        onToken: (fullTextSoFar) => {
          if (isMountedRef.current) {
            setStreamingText(fullTextSoFar);
          }
        },
        signal: abortControllerRef.current.signal,
      });

      // user message ถูก persist เป็นขั้นแรกของ sendMessage — รอเล็กน้อยแล้ว refresh
      await Promise.race([
        sendPromise.catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 150)),
      ]);
      await refreshAfterUserMessage();

      await sendPromise;
      await loadData();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error sending message:", err);
      }
      // โหลดข้อมูลใหม่ให้ user message ที่ persist ไว้แล้วยังแสดงอยู่
      await loadData();
    } finally {
      if (isMountedRef.current) {
        setIsStreaming(false);
        setStreamingText("");
      }
    }
  }, [activeSessionId, input, isStreaming, loadData, presenter]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((open) => !open);
  }, []);

  const formatTime = useCallback((iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  // Hydrate จาก localStorage ตอน mount เสมอ
  // (deviation จาก template guard `if (!initialViewModel)` — server ให้ค่าว่างเสมอ)
  useEffect(() => {
    // เรียกผ่าน setTimeout callback — ไม่เรียกฟังก์ชันที่มี setState ใน effect body
    // โดยตรง (กฎ react-hooks/set-state-in-effect)
    const timeoutId = setTimeout(loadData, 0);
    return () => clearTimeout(timeoutId);
  }, [loadData]);

  // Auto-scroll เมื่อมีข้อความใหม่หรือ token ใหม่ระหว่าง stream
  // ใช้ id แทน ref เพื่อไม่ต้องส่ง ref ผ่าน state ไปให้ View (กฎ refs-during-render)
  useEffect(() => {
    document
      .getElementById(MESSAGES_END_ID)
      ?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, streamingText]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return [
    {
      viewModel,
      activeSession,
      loading,
      error,
      isStreaming,
      streamingText,
      input,
      isSidebarOpen,
      renamingSessionId,
      renameInput,
      messagesEndId: MESSAGES_END_ID,
    },
    {
      loadData,
      selectSession,
      createSession,
      startRename,
      setRenameInput,
      commitRename,
      cancelRename,
      deleteSession,
      setModel,
      setInput,
      sendMessage,
      stopStreaming,
      toggleSidebar,
      setError,
      formatTime,
    },
  ];
}
