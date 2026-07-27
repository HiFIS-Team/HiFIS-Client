"use client";

import {
  MagnifyingGlassIcon,
  ChatBubbleOvalLeftIcon,
  BellIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

// v2 상단 헤더.
// 좌측 : HiFIS 로고 (public/logo.png).
// 우측 : 검색 · 알림톡 · 알림 · 프로필 아이콘 4개.
// static export 라 next/image 최적화 없음 → 그냥 <img>.
// onClick 은 지금 placeholder — 각 화면 붙는 시점에 연결.
export function GlobalHeader() {
  return (
    <header className="flex h-14 shrink-0 items-stretch justify-between border-b border-line bg-surface px-4">
      <div className="flex items-center">
        <img src="/icons/hifis-logo.png" alt="HiFIS" className="h-5 w-auto" />
      </div>
      <div className="flex items-stretch gap-1">
        <IconButton label="검색" onClick={() => {}}>
          <MagnifyingGlassIcon className="size-5" />
        </IconButton>
        <IconButton label="알림톡" onClick={() => {}}>
          <ChatBubbleOvalLeftIcon className="size-5" />
        </IconButton>
        <IconButton label="알림" onClick={() => {}}>
          <BellIcon className="size-5" />
        </IconButton>
        <IconButton label="내 정보" onClick={() => {}}>
          <UserIcon className="size-5" />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center rounded-md px-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
    >
      {children}
    </button>
  );
}
