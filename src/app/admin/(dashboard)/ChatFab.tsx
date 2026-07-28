"use client";

import { ChatBubbleOvalLeftIcon } from "@heroicons/react/24/outline";

// 사내톡 진입 FAB — 어드민 모든 페이지 우측 하단 고정.
// 모바일 : 하단 탭바 위 (bottom-24), PC : 낮게 (lg:bottom-6).
// onClick 은 placeholder — 사내톡 오버레이/라우팅 붙는 시점에 연결.
export function ChatFab() {
  return (
    <button
      type="button"
      aria-label="사내톡 열기"
      className="fixed right-5 bottom-24 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-transform hover:scale-105 active:scale-95 lg:bottom-6"
    >
      <ChatBubbleOvalLeftIcon className="size-6" />
    </button>
  );
}
