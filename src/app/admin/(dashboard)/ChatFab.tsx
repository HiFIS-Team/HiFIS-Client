"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChatBubbleOvalLeftIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// 사내톡 진입 FAB + 팝오버 (전체 어드민 공용).
// FAB : 우측 하단 primary 원. 클릭 시 팝오버 토글, open 시 아이콘 X 로 전환.
// 팝오버 : FAB 위쪽에 큰 카드 (대화 목록). 지금 mock — 실제 채팅 API 는 나중.

interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  avatarTone: string;
  memberCount?: number;
  preview: string;
  timeAgo: string;
  online?: boolean;
}
const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    type: "direct",
    name: "이앨리스",
    avatarTone: "bg-emerald-500",
    preview: "👍 확인했습니다 — 내일 보고 드릴게요!",
    timeAgo: "방금",
    online: true,
  },
  {
    id: "c2",
    type: "group",
    name: "개발팀",
    avatarTone: "bg-teal-500",
    memberCount: 3,
    preview: "📸 사진",
    timeAgo: "방금",
  },
  {
    id: "c3",
    type: "group",
    name: "전사 공지",
    avatarTone: "bg-slate-500",
    memberCount: 3,
    preview: "5/15 정수기 점검 안내드립니다.",
    timeAgo: "1일 전",
  },
];

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Esc 로 닫기. 바깥 클릭은 팝오버가 우하단이라 오히려 방해될 수 있어 생략.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={rootRef}>
      {/* 팝오버 — FAB 위쪽 */}
      {open && (
        <div
          role="dialog"
          aria-label="사내톡"
          className="animate-fade-in fixed right-5 bottom-40 z-40 flex h-[70vh] max-h-[640px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-line bg-card shadow-2xl lg:bottom-24"
        >
          <div className="flex items-start justify-between border-b border-line px-5 pt-5 pb-4">
            <div>
              <h2 className="text-xl font-black tracking-tighter text-fg">
                사내톡
              </h2>
              <p className="mt-0.5 text-xs text-muted">모든 메시지를 확인했어요</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="새 대화"
                className="flex size-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-card-hover hover:text-fg"
              >
                <UserPlusIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex size-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-card-hover hover:text-fg"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="px-5 pt-4">
            <label className="flex items-center gap-2 rounded-full border border-line bg-card-hover px-3 py-2">
              <MagnifyingGlassIcon className="size-4 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="이름 · 메시지 검색"
                className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none"
              />
            </label>
          </div>

          <ul className="mt-3 flex-1 divide-y divide-line overflow-y-auto">
            {CONVERSATIONS.map((c) => (
              <ConversationRow key={c.id} conv={c} />
            ))}
          </ul>
        </div>
      )}

      {/* FAB — open 시 X, 닫혀있을 때 채팅 아이콘 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "사내톡 닫기" : "사내톡 열기"}
        aria-expanded={open}
        className="fixed right-5 bottom-24 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-transform hover:scale-105 active:scale-95 lg:bottom-6"
      >
        {open ? (
          <XMarkIcon className="size-6" />
        ) : (
          <ChatBubbleOvalLeftIcon className="size-6" />
        )}
      </button>
    </div>
  );
}

function ConversationRow({ conv }: { conv: Conversation }) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-card-hover"
      >
        {/* 아바타 */}
        <span className="relative shrink-0">
          <span
            className={`flex size-10 items-center justify-center rounded-full text-sm font-bold text-white ${conv.avatarTone}`}
          >
            {conv.name.charAt(0)}
          </span>
          {conv.type === "group" ? (
            <span
              className="absolute right-0 bottom-0 flex size-4 items-center justify-center rounded-full border-2 border-card bg-violet-500 text-white"
              aria-hidden
            >
              <UsersIcon className="size-2.5" />
            </span>
          ) : conv.online ? (
            <span
              className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-card bg-emerald-500"
              aria-label="온라인"
            />
          ) : null}
        </span>

        {/* 이름 + 미리보기 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-fg">
              {conv.name}
            </span>
            {conv.memberCount != null && (
              <span className="text-xs text-muted tabular-nums">
                {conv.memberCount}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{conv.preview}</p>
        </div>

        {/* 시간 */}
        <span className="ml-2 shrink-0 self-start text-xs text-muted">
          {conv.timeAgo}
        </span>
      </button>
    </li>
  );
}
