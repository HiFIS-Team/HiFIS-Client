"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChatBubbleOvalLeftIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// 사내톡 진입 FAB + 팝오버 (전체 어드민 공용).
// 뷰 3 : list (대화 목록) / new (새 대화 만들기) / chat (특정 대화).
// mock — 실제 채팅 API·소켓·업로드는 다음 스텝.

// ─────────────── mock ───────────────

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

interface Member {
  id: string;
  name: string;
  team: string;
  position: string;
  avatarTone: string;
}
const MEMBERS: Member[] = [
  { id: "m1", name: "이앨리스", team: "디자인팀", position: "리드", avatarTone: "bg-emerald-500" },
  { id: "m2", name: "한이브", team: "운영팀", position: "팀장", avatarTone: "bg-violet-500" },
  { id: "m3", name: "박그레이스", team: "개발팀", position: "팀장", avatarTone: "bg-pink-500" },
  { id: "m4", name: "최마틴", team: "마케팅팀", position: "팀장", avatarTone: "bg-amber-500" },
  { id: "m5", name: "강레오", team: "영업팀", position: "팀장", avatarTone: "bg-sky-500" },
  { id: "m6", name: "윤소피아", team: "영업팀", position: "리드", avatarTone: "bg-red-500" },
];

interface Message {
  id: string;
  from: "me" | "other";
  text: string;
  time: string; // "오전 11:35"
  read?: number; // 안 읽음 카운트 (숫자)
  reactions?: { emoji: string; count: number }[];
}
const MOCK_MESSAGES: Message[] = [
  { id: "m1", from: "me", text: "…내려간 컨텍스트로 떠봤어서요.", time: "오전 11:27", reactions: [{ emoji: "🙏", count: 1 }, { emoji: "👀", count: 1 }] },
  { id: "m2", from: "other", text: "감사합니다 🙏 오늘 안에 PR 올려둘게요!", time: "오전 11:35", read: 1 },
  { id: "m3", from: "me", text: "👍", time: "오전 11:36" },
  { id: "m4", from: "other", text: "+ 스프린트 회고 시점 맞춰서 v2.1 같이 묶어서 가는 거 어떠세요?", time: "오후 2:25", read: 1 },
  { id: "m5", from: "me", text: "좋습니다. 박그레이스님께도 공유드릴게요.", time: "오후 2:30" },
  { id: "m6", from: "other", text: "👍 확인했습니다 — 내일 보고 드릴게요!", time: "오후 2:32", read: 1, reactions: [{ emoji: "🙌", count: 1 }] },
];

// ─────────────── ChatFab ───────────────

type View =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "chat"; conv: Conversation };

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 팝오버 닫을 때 뷰 초기화 (다음 열림 시 list 부터)
  function close() {
    setOpen(false);
    // 애니메이션 없이 즉시 리셋 — 팝오버 unmount 됨
    setTimeout(() => setView({ kind: "list" }), 0);
  }

  return (
    <div ref={rootRef}>
      {open && (
        <div
          role="dialog"
          aria-label="사내톡"
          className="animate-fade-in fixed right-5 bottom-40 z-40 flex h-[70vh] max-h-[640px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-line bg-card shadow-2xl lg:bottom-24"
        >
          {view.kind === "list" && (
            <ListView
              onClose={close}
              onNew={() => setView({ kind: "new" })}
              onOpen={(conv) => setView({ kind: "chat", conv })}
            />
          )}
          {view.kind === "new" && (
            <NewView
              onBack={() => setView({ kind: "list" })}
              onClose={close}
            />
          )}
          {view.kind === "chat" && (
            <ChatView
              conv={view.conv}
              onBack={() => setView({ kind: "list" })}
              onClose={close}
            />
          )}
        </div>
      )}

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

// ─────────────── List view ───────────────

function ListView({
  onClose,
  onNew,
  onOpen,
}: {
  onClose: () => void;
  onNew: () => void;
  onOpen: (conv: Conversation) => void;
}) {
  const [q, setQ] = useState("");
  return (
    <>
      <div className="flex items-start justify-between border-b border-line px-5 pt-5 pb-4">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-fg">사내톡</h2>
          <p className="mt-0.5 text-xs text-muted">모든 메시지를 확인했어요</p>
        </div>
        <div className="flex items-center gap-1">
          <RoundIconButton label="새 대화" onClick={onNew}>
            <UserPlusIcon className="size-4" />
          </RoundIconButton>
          <RoundIconButton label="닫기" onClick={onClose}>
            <XMarkIcon className="size-4" />
          </RoundIconButton>
        </div>
      </div>

      <div className="px-5 pt-4">
        <SearchInput value={q} onChange={setQ} placeholder="이름 · 메시지 검색" />
      </div>

      <ul className="mt-3 flex-1 divide-y divide-line overflow-y-auto">
        {CONVERSATIONS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c)}
              className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-card-hover"
            >
              <Avatar name={c.name} tone={c.avatarTone} online={c.online} group={c.type === "group"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-fg">
                    {c.name}
                  </span>
                  {c.memberCount != null && (
                    <span className="text-xs text-muted tabular-nums">
                      {c.memberCount}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">{c.preview}</p>
              </div>
              <span className="ml-2 shrink-0 self-start text-xs text-muted">
                {c.timeAgo}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ─────────────── New view ───────────────

function NewView({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = MEMBERS.filter(
    (m) =>
      !q ||
      m.name.includes(q) ||
      m.team.includes(q) ||
      m.position.includes(q),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <RoundIconButton label="뒤로" onClick={onBack}>
          <ChevronLeftIcon className="size-4" />
        </RoundIconButton>
        <RoundIconButton label="닫기" onClick={onClose}>
          <XMarkIcon className="size-4" />
        </RoundIconButton>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
        <div>
          <label className="text-sm font-semibold text-fg">그룹 이름 (선택)</label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="예) 마케팅 팀"
            className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-fg">멤버 추가</label>
          <div className="mt-2">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="이름 · 팀 · 직책으로 검색"
            />
          </div>
          <ul className="mt-2 divide-y divide-line">
            {filtered.map((m) => {
              const checked = selected.has(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-card-hover"
                  >
                    <Avatar name={m.name} tone={m.avatarTone} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-fg">
                        {m.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {m.team} · {m.position}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors ${
                        checked
                          ? "border-primary bg-primary"
                          : "border-line bg-transparent"
                      }`}
                    >
                      {checked && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 하단 확인 (선택된 게 있으면 활성) */}
      <div className="border-t border-line px-5 py-3">
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={onBack}
          className="w-full rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:opacity-40"
        >
          {selected.size > 0 ? `${selected.size}명 대화 시작` : "멤버를 선택하세요"}
        </button>
      </div>
    </>
  );
}

// ─────────────── Chat view ───────────────

function ChatView({
  conv,
  onBack,
  onClose,
}: {
  conv: Conversation;
  onBack: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const subtitle =
    conv.type === "direct" ? "1:1 대화" : `그룹 · ${conv.memberCount ?? 0}명`;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <RoundIconButton label="뒤로" onClick={onBack}>
          <ChevronLeftIcon className="size-4" />
        </RoundIconButton>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar name={conv.name} tone={conv.avatarTone} online={conv.online} group={conv.type === "group"} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{conv.name}</p>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        <RoundIconButton label="닫기" onClick={onClose}>
          <XMarkIcon className="size-4" />
        </RoundIconButton>
      </div>

      <ul className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {MOCK_MESSAGES.map((m) => (
          <MessageRow key={m.id} conv={conv} msg={m} />
        ))}
      </ul>

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-line bg-card-hover px-4 py-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="메시지를 입력하세요"
            className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none"
          />
          <button
            type="button"
            aria-label="파일 첨부"
            className="rounded-md p-1 text-muted hover:text-fg"
          >
            <PaperClipIcon className="size-5" />
          </button>
        </div>
      </div>
    </>
  );
}

function MessageRow({ conv, msg }: { conv: Conversation; msg: Message }) {
  const me = msg.from === "me";
  return (
    <li className={`flex items-end gap-2 ${me ? "justify-end" : "justify-start"}`}>
      {!me && <Avatar name={conv.name} tone={conv.avatarTone} online={conv.online} size="sm" />}
      {me && (
        <div className="flex flex-col items-end">
          <span className="text-[11px] text-muted tabular-nums">{msg.time}</span>
        </div>
      )}
      <div className={`flex max-w-[70%] flex-col ${me ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            me
              ? "bg-primary/25 text-fg"
              : "bg-card-hover text-fg"
          }`}
        >
          {msg.text}
        </div>
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="mt-1 flex gap-1">
            {msg.reactions.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs"
              >
                <span>{r.emoji}</span>
                <span className="tabular-nums text-primary">{r.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      {!me && (
        <div className="flex flex-col">
          {msg.read != null && (
            <span className="text-[11px] font-semibold tabular-nums text-primary">
              {msg.read}
            </span>
          )}
          <span className="text-[11px] text-muted tabular-nums">{msg.time}</span>
        </div>
      )}
    </li>
  );
}

// ─────────────── shared ───────────────

function RoundIconButton({
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
      className="flex size-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-card-hover hover:text-fg"
    >
      {children}
    </button>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-line bg-card-hover px-3 py-2">
      <MagnifyingGlassIcon className="size-4 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none"
      />
    </label>
  );
}

function Avatar({
  name,
  tone,
  online,
  group,
  size = "md",
}: {
  name: string;
  tone: string;
  online?: boolean;
  group?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls =
    size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-11 text-base" : "size-10 text-sm";
  const badgeCls =
    size === "sm" ? "size-2.5" : "size-3";
  const groupBadgeCls = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span className="relative shrink-0">
      <span
        className={`flex items-center justify-center rounded-full font-bold text-white ${sizeCls} ${tone}`}
      >
        {name.charAt(0)}
      </span>
      {group ? (
        <span
          className={`absolute right-0 bottom-0 flex items-center justify-center rounded-full border-2 border-card bg-violet-500 text-white ${groupBadgeCls}`}
          aria-hidden
        >
          <UsersIcon className="size-2.5" />
        </span>
      ) : online ? (
        <span
          className={`absolute right-0 bottom-0 rounded-full border-2 border-card bg-emerald-500 ${badgeCls}`}
          aria-label="온라인"
        />
      ) : null}
    </span>
  );
}
