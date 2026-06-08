"use client";

import { useEffect } from "react";

// 모달이 열려있는 동안 페이지 본문 스크롤을 잠근다.
// 단순히 overflow:hidden 만으론 iOS Safari 가 안 잡혀서 position:fixed +
// top:-scrollY 트릭으로 시각적 위치까지 고정. 잠금 해제 시 scrollTo 로 원복.
// 여러 모달이 중첩 오픈된 경우(예: 회원 상세 → 약관) 카운트로 관리해서
// 마지막 하나가 닫힐 때만 해제.

let lockCount = 0;
let savedScrollY = 0;
let savedBodyStyle: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
} | null = null;

function lockScroll() {
  if (typeof document === "undefined") return;
  lockCount += 1;
  if (lockCount > 1) return; // 이미 잠겨있음 — 카운트만 증가
  const body = document.body;
  savedScrollY = window.scrollY;
  savedBodyStyle = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
  };
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
}

function unlockScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedBodyStyle) return;
  const body = document.body;
  body.style.position = savedBodyStyle.position;
  body.style.top = savedBodyStyle.top;
  body.style.left = savedBodyStyle.left;
  body.style.right = savedBodyStyle.right;
  body.style.width = savedBodyStyle.width;
  body.style.overflow = savedBodyStyle.overflow;
  window.scrollTo(0, savedScrollY);
  savedBodyStyle = null;
}

// active=false 면 잠금 안 함 (open prop 패턴 다이얼로그 — 항상 마운트 + open 으로 토글).
export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    lockScroll();
    return () => unlockScroll();
  }, [active]);
}
