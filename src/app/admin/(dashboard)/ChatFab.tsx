"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  ChatBubbleOvalLeftIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Switch } from "@/components/Switch";

// 사내톡 진입 FAB + 팝오버 (전체 어드민 공용).
// 뷰 3 : list (대화 목록) / new (새 대화 만들기) / chat (특정 대화).
// mock — 실제 채팅 API·소켓·업로드는 다음 스텝.
// state 는 팝오버 최상위 (ChatFab) 에서 : 대화 목록·대화별 메시지.
// new 뷰에서 방 만들면 conversations 에 append + 그 방으로 chat 뷰 오픈.

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
const INITIAL_CONVERSATIONS: Conversation[] = [
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
  time: string;
  read?: number;
  reactions?: { emoji: string; count: number }[];
}
const INITIAL_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: "m1", from: "me", text: "…내려간 컨텍스트로 떠봤어서요.", time: "오전 11:27", reactions: [{ emoji: "🙏", count: 1 }, { emoji: "👀", count: 1 }] },
    { id: "m2", from: "other", text: "감사합니다 🙏 오늘 안에 PR 올려둘게요!", time: "오전 11:35", read: 1 },
    { id: "m3", from: "me", text: "👍", time: "오전 11:36" },
    { id: "m4", from: "other", text: "+ 스프린트 회고 시점 맞춰서 v2.1 같이 묶어서 가는 거 어떠세요?", time: "오후 2:25", read: 1 },
    { id: "m5", from: "me", text: "좋습니다. 박그레이스님께도 공유드릴게요.", time: "오후 2:30" },
    { id: "m6", from: "other", text: "👍 확인했습니다 — 내일 보고 드릴게요!", time: "오후 2:32", read: 1, reactions: [{ emoji: "🙌", count: 1 }] },
  ],
  c2: [],
  c3: [],
};

// 새 방 아바타 랜덤 톤 (id 해시로 결정 — hydration 안전)
const GROUP_TONES = [
  "bg-teal-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-pink-500",
  "bg-emerald-500",
];

// 현재 시각 → "오전 HH:MM" 형식. 클릭 이벤트에서만 호출 → hydration 무관.
function formatNowKo(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const isPM = h >= 12;
  const hh12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${isPM ? "오후" : "오전"} ${String(hh12).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─────────────── ChatFab ───────────────

type View =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "chat"; convId: string }
  | { kind: "settings"; convId: string };

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setTimeout(() => setView({ kind: "list" }), 0);
  }

  // new 뷰에서 확정 : 새 conv 만들고 chat 뷰로. 초기 메시지 없음 (빈 방).
  function createConversation(name: string, memberIds: string[]) {
    const id = `c-${conversations.length + 1}-${memberIds.length}`;
    const isGroup = memberIds.length > 1;
    // 1:1 이면 상대 이름·아바타 그대로. 그룹이면 그룹 이름 (없으면 자동).
    let conv: Conversation;
    if (!isGroup) {
      const m = MEMBERS.find((x) => x.id === memberIds[0])!;
      conv = {
        id,
        type: "direct",
        name: m.name,
        avatarTone: m.avatarTone,
        preview: "새 대화가 생성됐어요",
        timeAgo: "방금",
      };
    } else {
      const displayName = name.trim() || `그룹 · ${memberIds.length}명`;
      const toneIndex = conversations.length % GROUP_TONES.length;
      conv = {
        id,
        type: "group",
        name: displayName,
        avatarTone: GROUP_TONES[toneIndex],
        memberCount: memberIds.length,
        preview: "새 그룹이 생성됐어요",
        timeAgo: "방금",
      };
    }
    setConversations((prev) => [conv, ...prev]);
    setMessagesByConv((prev) => ({ ...prev, [id]: [] }));
    setView({ kind: "chat", convId: id });
  }

  function sendMessage(convId: string, text: string) {
    const now = formatNowKo();
    const msg: Message = {
      id: `msg-${convId}-${(messagesByConv[convId]?.length ?? 0) + 1}`,
      from: "me",
      text,
      time: now,
    };
    setMessagesByConv((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), msg],
    }));
    // 목록 preview 도 갱신
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, preview: text, timeAgo: "방금" } : c,
      ),
    );
  }

  function renameConversation(convId: string, name: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, name } : c)),
    );
  }

  const currentConv =
    view.kind === "chat" || view.kind === "settings"
      ? conversations.find((c) => c.id === view.convId)
      : null;

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
              conversations={conversations}
              onClose={close}
              onNew={() => setView({ kind: "new" })}
              onOpen={(conv) => setView({ kind: "chat", convId: conv.id })}
            />
          )}
          {view.kind === "new" && (
            <NewView
              onBack={() => setView({ kind: "list" })}
              onClose={close}
              onCreate={createConversation}
            />
          )}
          {view.kind === "chat" && currentConv && (
            <ChatView
              conv={currentConv}
              messages={messagesByConv[currentConv.id] ?? []}
              onBack={() => setView({ kind: "list" })}
              onClose={close}
              onSend={(t) => sendMessage(currentConv.id, t)}
              onOpenSettings={() =>
                setView({ kind: "settings", convId: currentConv.id })
              }
            />
          )}
          {view.kind === "settings" && currentConv && (
            <SettingsView
              conv={currentConv}
              onBack={() => setView({ kind: "chat", convId: currentConv.id })}
              onClose={close}
              onRename={(name) => renameConversation(currentConv.id, name)}
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
  conversations,
  onClose,
  onNew,
  onOpen,
}: {
  conversations: Conversation[];
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
        {conversations.map((c) => (
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
  onCreate,
}: {
  onBack: () => void;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
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

  function confirm() {
    if (selected.size === 0) return;
    onCreate(groupName, Array.from(selected));
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

      <div className="border-t border-line px-5 py-3">
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={confirm}
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
  messages,
  onBack,
  onClose,
  onSend,
  onOpenSettings,
}: {
  conv: Conversation;
  messages: Message[];
  onBack: () => void;
  onClose: () => void;
  onSend: (text: string) => void;
  onOpenSettings: () => void;
}) {
  const [draft, setDraft] = useState("");
  const subtitle =
    conv.type === "direct" ? "1:1 대화" : `그룹 · ${conv.memberCount ?? 0}명`;
  const canSend = draft.trim().length > 0;

  const listRef = useRef<HTMLUListElement>(null);
  // 메시지 늘어나면 하단으로 스크롤
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  function submit() {
    if (!canSend) return;
    onSend(draft.trim());
    setDraft("");
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <RoundIconButton label="뒤로" onClick={onBack}>
          <ChevronLeftIcon className="size-4" />
        </RoundIconButton>
        {/* 아바타·이름 부분 클릭 → 채팅방 설정. hover 시 툴팁. */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="group relative flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-card-hover"
        >
          <Avatar
            name={conv.name}
            tone={conv.avatarTone}
            online={conv.online}
            group={conv.type === "group"}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{conv.name}</p>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full left-1/2 z-10 mt-1 -translate-x-1/2 rounded-md border border-line bg-card-hover px-2 py-1 text-xs whitespace-nowrap text-fg opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          >
            채팅방 설정
          </span>
        </button>
        <RoundIconButton label="닫기" onClick={onClose}>
          <XMarkIcon className="size-4" />
        </RoundIconButton>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-card-hover">
            <ChatBubbleOvalLeftIcon className="size-6 text-muted" />
          </div>
          <p className="text-sm text-muted">첫 메시지를 보내볼까요?</p>
        </div>
      ) : (
        <ul
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {messages.map((m) => (
            <MessageRow key={m.id} conv={conv} msg={m} />
          ))}
        </ul>
      )}

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-full border border-line bg-card-hover px-4 py-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="메시지를 입력하세요"
              className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none"
            />
          </label>
          {/* send 버튼 : draft 있을 때만 부드럽게 등장. 자리는 항상 차지해 레이아웃 안정. */}
          <button
            type="button"
            onClick={submit}
            aria-label="보내기"
            className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-all duration-200 ${
              canSend
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-75 opacity-0"
            }`}
          >
            <ArrowUpIcon className="size-5" />
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
            me ? "bg-primary/25 text-fg" : "bg-card-hover text-fg"
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

// ─────────────── Settings view ───────────────

type ShareTab = "photo" | "video" | "file";
const SHARE_TABS: { key: ShareTab; label: string; count: number; emptyText: string }[] = [
  { key: "photo", label: "사진", count: 0, emptyText: "공유된 사진이 없어요" },
  { key: "video", label: "영상", count: 0, emptyText: "공유된 영상이 없어요" },
  { key: "file", label: "파일", count: 0, emptyText: "공유된 파일이 없어요" },
];

function SettingsView({
  conv,
  onBack,
  onClose,
  onRename,
}: {
  conv: Conversation;
  onBack: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(conv.name);
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<ShareTab>("photo");

  const dirty = name.trim() !== conv.name && name.trim().length > 0;

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

      <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-6">
        {/* 아바타 + 이름 */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <Avatar
            name={conv.name}
            tone={conv.avatarTone}
            online={conv.online}
            group={conv.type === "group"}
            size="xl"
          />
          <p className="text-lg font-black tracking-tighter text-fg">
            {conv.name}
          </p>
        </div>

        {/* 이름 변경 */}
        <section>
          <p className="text-xs font-semibold text-muted">이름 변경</p>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none"
            />
            <button
              type="button"
              disabled={!dirty}
              onClick={() => onRename(name.trim())}
              className="rounded-md border border-line px-3 py-1 text-xs font-semibold text-fg transition-colors hover:bg-card disabled:opacity-40"
            >
              변경
            </button>
          </div>
        </section>

        {/* 알림 */}
        <section>
          <p className="text-xs font-semibold text-muted">알림</p>
          <div className="mt-2 flex items-center justify-between rounded-md border border-line bg-card-hover px-4 py-3">
            <div>
              <p className="text-sm font-bold text-fg">알림 끄기</p>
              <p className="mt-0.5 text-xs text-muted">
                {muted ? "메시지 알림을 받지 않아요" : "메시지 알림을 받아요"}
              </p>
            </div>
            <Switch
              checked={muted}
              onChange={setMuted}
              ariaLabel="채팅방 알림 끄기"
            />
          </div>
        </section>

        {/* 공유된 콘텐츠 */}
        <section>
          <p className="text-xs font-semibold text-muted">공유된 콘텐츠</p>
          <div className="mt-2 flex gap-4 border-b border-line">
            {SHARE_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative pb-2 text-sm font-semibold transition-colors ${
                    active ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {t.label}{" "}
                  <span
                    className={`ml-0.5 tabular-nums ${active ? "text-primary" : "text-muted"}`}
                  >
                    {t.count}
                  </span>
                  {active && (
                    <span className="absolute right-0 -bottom-px left-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-muted">
            {SHARE_TABS.find((t) => t.key === tab)?.emptyText}
          </p>
        </section>
      </div>
    </>
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
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeCls =
    size === "sm"
      ? "size-8 text-xs"
      : size === "lg"
        ? "size-11 text-base"
        : size === "xl"
          ? "size-20 text-2xl"
          : "size-10 text-sm";
  const badgeCls =
    size === "sm" ? "size-2.5" : size === "xl" ? "size-5" : "size-3";
  const groupBadgeCls =
    size === "sm" ? "size-3.5" : size === "xl" ? "size-7" : "size-4";
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
