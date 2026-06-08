import { useEffect } from "react";
import { useBodyScrollLock } from "./useBodyScrollLock";

// 모달 라이프사이클 훅 — 두 가지 부수효과를 묶음:
//   1) Esc 키 누르면 콜백 실행 (모달 닫기)
//   2) 모달이 열려있는 동안 페이지 본문 스크롤 잠금
// active=false 면 둘 다 끔 (모달이 닫혀있을 때 불필요한 리스너/잠금 방지).
// 모달마다 둘 다 필요해서 한 훅으로 묶음 — 호출처는 useEscapeKey(onClose, open?) 만.
export function useEscapeKey(onEscape: () => void, active = true): void {
  useBodyScrollLock(active);
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape, active]);
}
