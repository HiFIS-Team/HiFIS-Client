"use client";

import { useRef, useState, type ReactNode } from "react";

// 관리자 인증 화면 공통 레이아웃 — 회색 배경에 카드.
// 평소: 중앙 정렬.
// 모바일·태블릿(lg 미만) 에서 텍스트 인풋 포커스 시 카드를 위로 살짝 끌어올림:
//   → PWA 에선 iOS 자체 auto-scroll 이 잘 안 일어나서 명시적 시프트 필요
//   → React state 로 직접 추적 (CSS :has() 셀렉터가 iOS PWA cold start 에서
//     첫 포커스에는 반응이 늦는 quirk 회피)
//   → margin-top 으로 시프트 (transform 은 iOS caret lag)
//   → 6vh ≈ 50pt — 키보드에 가리지 않게 끌어올리되 과하지 않게
//   → blur 후 250ms 유예 — 인풋에서 링크 탭 시 layout 변동으로 click 이
//     빈 공간에 떨어지는 문제 방지
// 상단에 HiFIS 로고 + 제목.
export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [shifted, setShifted] = useState(false);
  // blur 직후 곧바로 unshift 하면 링크 클릭이 빈 공간으로 가버려 내비게이션 실패.
  // 250ms 지연 후 unshift — 클릭 이벤트가 먼저 완료되도록 함.
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function isTextInput(el: EventTarget | null): el is HTMLInputElement {
    return el instanceof HTMLInputElement && el.type !== "checkbox";
  }

  function handleFocus(e: React.FocusEvent<HTMLElement>) {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    if (isTextInput(e.target)) setShifted(true);
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    // 다음 포커스가 또 다른 텍스트 인풋이면 시프트 유지 — 인풋 사이 전환 시 깜빡임 방지
    if (isTextInput(e.relatedTarget)) return;
    blurTimer.current = setTimeout(() => setShifted(false), 250);
  }

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-gray-50 px-6 py-12"
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div
        className={`w-full max-w-sm transition-[margin-top] duration-300 ease-out ${
          shifted ? "max-lg:-mt-[6vh]" : ""
        }`}
      >
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            aria-hidden="true"
            className="mx-auto size-14"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
