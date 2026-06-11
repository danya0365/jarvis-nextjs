"use client";

import { useCallback, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "jarvis.theme";

// Store เล็กๆ sync กับ class `.dark` บน <html>
// ใช้ useSyncExternalStore แทน mounted-state pattern
// (กฎ react-hooks/set-state-in-effect ห้าม setState synchronous ใน effect)
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

function toggleTheme(): void {
  const nextIsDark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", nextIsDark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? "dark" : "light");
  } catch {
    // localStorage ใช้ไม่ได้ (เช่น private mode) — toggle ยังทำงานแต่ไม่จำค่า
  }
  listeners.forEach((listener) => listener());
}

/**
 * ThemeToggle
 * ปุ่มสลับ Light/Dark mode — toggle class `.dark` ที่ <html>
 * และจำค่าไว้ใน localStorage (ทำงานคู่กับ inline script ใน layout ที่กัน FOUC)
 */
export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    toggleTheme();
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      title={isDark ? "โหมดสว่าง" : "โหมดมืด"}
      className="w-9 h-9 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors flex items-center justify-center"
    >
      <span aria-hidden>{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
