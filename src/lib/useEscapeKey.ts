import { useEffect } from "react";

// Esc 키 누르면 콜백 실행 — 모달 닫기 등에 사용.
// active=false 면 리스너 등록 안 함 (모달이 닫혀있을 때 불필요한 리스너 방지).
export function useEscapeKey(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape, active]);
}
