"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getMe as getMeV2 } from "@/lib/api/v2/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import {
  createRoom,
  listMessages,
  listRooms,
  markRoomRead,
  sendMessage,
  type ChatRoomOut,
  type MessageOut,
} from "@/lib/api/v2/chat";
import { useChatWs } from "@/lib/api/v2/chatWs";
import type { EmployeeOut } from "@/lib/api/v2/types";

// 사내톡 FAB — GET /chat/rooms · GET/POST /chat/rooms/{id}/messages · POST /chat/rooms/{id}/read.
// 실시간 : useChatWs 로 message/typing/read 수신. 전송은 REST 유지 (UX 명확).
// 폴링 : WS 실패/재연결 창구용 백업.

const POLL_MS = 15_000;

type View =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "chat"; roomId: string }
  | { kind: "settings"; roomId: string };

// open/onOpenChange 를 넘기면 controlled — layout 이 open state 를 소유해서
// 모바일 헤더 아이콘 · PC FAB 모두 같은 팝오버를 열 수 있게 한다.
// 안 넘기면 (하위호환) 내부 state 로 동작.
export function ChatFab({
  open: openProp,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
} = {}) {
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInternal;
  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const value = typeof next === "function" ? next(open) : next;
      if (isControlled) onOpenChange?.(value);
      else setOpenInternal(value);
    },
    [open, isControlled, onOpenChange],
  );
  // 스택형 view — iOS 네비 스택. push 시 이전 view 는 mount 유지, 새 view 만
  // 위에서 슬라이드 인. pop 시 top view 만 제거 → 뒤에 남아있던 이전 view 노출.
  // 이전 view 가 사라지지 않고 자연스러운 앞뒤 스택 톤.
  const [stack, setStack] = useState<View[]>([{ kind: "list" }]);
  // popping : 뒤로 가기 애니메이션 재생 중. top view 에 slide-out 클래스 부여 후
  // 250ms 지연으로 실제 unmount → 왼쪽으로 밀려나가는 톤. 중복 pop 방지도 겸함.
  const [popping, setPopping] = useState(false);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((v: View) => {
    setStack((prev) => [...prev, v]);
  }, []);
  // pop : 모바일이면 slide-out 재생 후 stack.pop. PC 는 즉시.
  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const isMobileNow =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1023px)").matches;
      if (!isMobileNow) return prev.slice(0, -1);
      // 모바일 : popping 재생 후 실제 제거는 setTimeout 로.
      setPopping(true);
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
      popTimerRef.current = setTimeout(() => {
        setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
        setPopping(false);
        popTimerRef.current = null;
      }, 250);
      return prev;
    });
  }, []);
  useEffect(
    () => () => {
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
    },
    [],
  );
  // new → 대화 생성 완료 시 : new 를 chat 으로 교체 (뒤로 갈 때 new 로 안 돌아가게).
  const replaceTop = useCallback((v: View) => {
    setStack((prev) => [...prev.slice(0, -1), v]);
  }, []);
  const resetToList = useCallback(() => {
    setStack([{ kind: "list" }]);
    setPopping(false);
    if (popTimerRef.current) {
      clearTimeout(popTimerRef.current);
      popTimerRef.current = null;
    }
  }, []);
  const queryClient = useQueryClient();

  // 뷰포트 판정 — Tailwind lg: / max-lg: 오버라이드가 이 프로젝트에서
  // 안정적으로 안 먹는 상황이 있어 JS 로 확실히 breakpoint 결정.
  // isMobile 로 slide 애니메이션 클래스를 조건부로만 붙임.
  const [isMobile, setIsMobile] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 닫기 애니메이션 처리 — open 이 false 로 바뀌면 즉시 unmount 하지 않고
  // 모바일에서만 slide-out (250ms) 재생 후 unmount.
  // displayOpen : 실제로 dialog 를 렌더할지. closing : slide-out 중인지.
  // PC 는 fade 라 즉시 unmount (지연 두면 잔상 이상함).
  const [displayOpen, setDisplayOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    // open prop 과 내부 렌더 상태 동기화 — 파생 state 이므로 setState 불가피.
    if (open) {
      setClosing(false);
      setDisplayOpen(true);
      return;
    }
    if (!displayOpen) return;
    if (!isMobile) {
      setDisplayOpen(false);
      return;
    }
    setClosing(true);
    const t = setTimeout(() => {
      setDisplayOpen(false);
      setClosing(false);
    }, 250);
    return () => clearTimeout(t);
    // displayOpen 은 내부 파생 상태 — 의도적으로 deps 에서 제외해 무한 루프 방지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // WS 는 팝오버 열려있는 동안만 유지 (배터리·연결 수 절약).
  const ws = useChatWs(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  function close() {
    setOpen(false);
    // dialog slide-out 후 stack 리셋 — 다시 열 때 list 부터.
    setTimeout(() => resetToList(), 0);
  }

  const meQuery = useQuery({ queryKey: ["v2", "me"], queryFn: getMeV2 });
  const meId = meQuery.data?.id ?? null;

  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
  const employees = employeesQuery.data ?? [];
  const employeeMap = useMemo(() => {
    const m = new Map<string, EmployeeOut>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  // WS 연결 상태에 따라 폴링 간격 조정 (WS 있으면 백업용 60초, 없으면 15초).
  const roomsQuery = useQuery({
    queryKey: ["v2", "chat", "rooms"] as const,
    queryFn: listRooms,
    refetchInterval: open ? (ws.connected ? 60_000 : POLL_MS) : false,
    enabled: open,
  });
  const rooms = roomsQuery.data ?? [];

  // stack 의 특정 view 에 대응하는 room lookup — chat/settings 뷰만 room 필요.
  const roomOf = (v: View) =>
    v.kind === "chat" || v.kind === "settings"
      ? rooms.find((r) => r.id === v.roomId) ?? null
      : null;

  return (
    <div>
      {displayOpen && (
        <div
          role="dialog"
          aria-label="사내톡"
          className={`fixed inset-0 z-50 flex flex-col bg-card lg:top-auto lg:right-5 lg:bottom-24 lg:left-auto lg:z-40 lg:h-[70vh] lg:max-h-[640px] lg:w-[calc(100vw-2.5rem)] lg:max-w-sm lg:overflow-hidden lg:rounded-lg lg:border lg:border-line lg:shadow-2xl ${
            isMobile
              ? closing
                ? "animate-page-slide-out"
                : "animate-page-slide-in"
              : "animate-fade-in"
          }`}
        >
          {/* iOS 네비 스택 톤 — stack 의 모든 view 를 absolute inset-0 로 겹쳐
              렌더. 새로 push 된 top view 만 우측에서 slide-in (모바일).
              이전 view 는 뒤에 남아있어 슬라이드 인 시작 순간 왼쪽으로 살짝 노출됨.
              PC 는 애니메이션 없이 그대로. */}
          {stack.map((v, i) => {
            const isTop = i === stack.length - 1;
            // slide-in 은 각 frame 이 mount 될 때만 재생 (StackFrame 내부 관리).
            // popping 은 부모가 판단 (top 이면서 pop 중일 때만 slide-out 재생).
            const stackRoom = roomOf(v);
            return (
              <StackFrame
                key={`${i}-${v.kind}`}
                animateOnMount={isMobile && i > 0}
                popping={isMobile && isTop && popping}
                zIndex={i}
              >
                {v.kind === "list" && (
                  <ListView
                    rooms={rooms}
                    meId={meId}
                    employeeMap={employeeMap}
                    isLoading={roomsQuery.isLoading}
                    isError={roomsQuery.isError}
                    error={roomsQuery.error}
                    onClose={close}
                    onNew={() => push({ kind: "new" })}
                    onOpen={(room) => push({ kind: "chat", roomId: room.id })}
                  />
                )}
                {v.kind === "new" && (
                  <NewView
                    employees={employees.filter((e) => e.id !== meId)}
                    onBack={pop}
                    onClose={close}
                    onCreated={(room) => {
                      queryClient.invalidateQueries({
                        queryKey: ["v2", "chat", "rooms"],
                      });
                      // new 를 chat 으로 교체 — 뒤로 갈 때 new 로 돌아가지 않게.
                      replaceTop({ kind: "chat", roomId: room.id });
                    }}
                  />
                )}
                {v.kind === "chat" && stackRoom && (
                  <ChatView
                    room={stackRoom}
                    meId={meId}
                    employeeMap={employeeMap}
                    typingIds={
                      ws.typingByRoom.get(stackRoom.id) ?? new Set()
                    }
                    wsConnected={ws.connected}
                    wsSend={ws.send}
                    onBack={pop}
                    onClose={close}
                    onOpenSettings={() =>
                      push({ kind: "settings", roomId: stackRoom.id })
                    }
                  />
                )}
                {v.kind === "settings" && stackRoom && (
                  <SettingsView
                    room={stackRoom}
                    meId={meId}
                    employeeMap={employeeMap}
                    onBack={pop}
                    onClose={close}
                  />
                )}
              </StackFrame>
            );
          })}
        </div>
      )}

      {/* PC 전용 FAB — 모바일은 헤더 아이콘이 트리거 (lg:hidden 반대). */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "사내톡 닫기" : "사내톡 열기"}
        aria-expanded={open}
        className="fixed right-5 bottom-6 z-40 hidden size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-transform hover:scale-105 active:scale-95 lg:flex"
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

// ─────────────── StackFrame ───────────────

// iOS 네비 스택의 각 frame — absolute inset-0 로 dialog 안 채움.
// slide-in 은 mount 시점에만 재생 (이후 리렌더로 className 이 바뀌어도
// 재재생 되지 않게 초기 클래스만 유지). 이게 없으면 상위 view 가 pop 될 때
// 아래 남아있는 view 가 다시 top 이 되며 slide-in 이 재재생되는 버그가 생김.
// popping (부모가 결정) 이 true 이면 slide-out 재생.
function StackFrame({
  animateOnMount,
  popping,
  zIndex,
  children,
}: {
  animateOnMount: boolean;
  popping: boolean;
  zIndex: number;
  children: React.ReactNode;
}) {
  // 첫 render 시 애니메이션 클래스 결정 후 state 로 고정 — 이후 리렌더 시 값 유지.
  // React 는 className 이 같은 문자열이면 DOM 업데이트 안 함 → 브라우저도 애니메이션 재재생 안 함.
  const [initialAnim] = useState<string>(() =>
    animateOnMount ? "animate-page-slide-in" : "",
  );
  const cls = popping ? "animate-page-slide-out" : initialAnim;
  return (
    <div
      className={`absolute inset-0 flex flex-col bg-card ${cls}`}
      style={{ zIndex }}
    >
      {children}
    </div>
  );
}

// ─────────────── 방 표시 헬퍼 ───────────────

function roomDisplay(
  room: ChatRoomOut,
  meId: string | null,
  employeeMap: Map<string, EmployeeOut>,
): { name: string; tone: string; online: boolean; isGroup: boolean; memberCount: number } {
  if (room.isGroup) {
    return {
      name: room.name || `그룹 · ${room.memberIds.length}명`,
      tone: "bg-violet-500",
      online: false,
      isGroup: true,
      memberCount: room.memberIds.length,
    };
  }
  // DM : 상대(나 아닌) 첫 멤버 기준.
  const other = room.memberIds.find((id) => id !== meId);
  const emp = other ? employeeMap.get(other) : undefined;
  return {
    name: emp?.name ?? room.name ?? "1:1 대화",
    tone: avatarTone(emp?.avatarColor),
    online: emp?.workStatus === "AUTO", // 대략적 판정 — WS 실측 붙으면 교체
    isGroup: false,
    memberCount: 2,
  };
}

// ─────────────── List view ───────────────

function ListView({
  rooms,
  meId,
  employeeMap,
  isLoading,
  isError,
  error,
  onClose,
  onNew,
  onOpen,
}: {
  rooms: ChatRoomOut[];
  meId: string | null;
  employeeMap: Map<string, EmployeeOut>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onNew: () => void;
  onOpen: (room: ChatRoomOut) => void;
}) {
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();
  const filtered = kw
    ? rooms.filter((r) => {
        const d = roomDisplay(r, meId, employeeMap);
        return (
          d.name.toLowerCase().includes(kw) ||
          (r.lastMessage?.body ?? "").toLowerCase().includes(kw)
        );
      })
    : rooms;

  return (
    <>
      <div className="flex items-start justify-between border-b border-line px-5 pt-5 pb-4">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-fg">
            사내톡
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {rooms.reduce((sum, r) => sum + r.unreadCount, 0) === 0
              ? "모든 메시지를 확인했어요"
              : `안 읽은 메시지가 있어요`}
          </p>
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
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="이름 · 메시지 검색"
        />
      </div>

      {isLoading ? (
        <div className="flex-1 space-y-3 px-5 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-10 animate-pulse rounded-full bg-card-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-card-hover" />
                <div className="h-2 w-2/3 animate-pulse rounded bg-card-hover" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex-1 px-5 py-8 text-center text-sm text-red-300">
          {getV2ErrorMessage(error)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 px-5 py-10 text-center text-sm text-muted">
          {rooms.length === 0
            ? "아직 대화가 없어요. 새 대화를 시작해 보세요."
            : "검색 결과가 없어요."}
        </div>
      ) : (
        <ul className="mt-3 flex-1 divide-y divide-line overflow-y-auto">
          {filtered.map((r) => {
            const d = roomDisplay(r, meId, employeeMap);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-card-hover"
                >
                  <Avatar
                    name={d.name}
                    tone={d.tone}
                    online={d.online}
                    group={d.isGroup}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-fg">
                        {d.name}
                      </span>
                      {d.isGroup && (
                        <span className="text-xs text-muted tabular-nums">
                          {d.memberCount}
                        </span>
                      )}
                      {r.unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                          {r.unreadCount > 9 ? "9+" : r.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {r.lastMessage?.body ?? "새 대화가 생성됐어요"}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 self-start text-xs text-muted">
                    {timeAgoShort(
                      r.lastMessage?.createdAt ?? r.updatedAt,
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ─────────────── New view ───────────────

function NewView({
  employees,
  onBack,
  onClose,
  onCreated,
}: {
  employees: EmployeeOut[];
  onBack: () => void;
  onClose: () => void;
  onCreated: (room: ChatRoomOut) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const kw = q.trim().toLowerCase();
  const filtered = kw
    ? employees.filter(
        (m) =>
          m.name.toLowerCase().includes(kw) ||
          (m.team ?? "").toLowerCase().includes(kw),
      )
    : employees;

  const mutation = useMutation({
    mutationFn: createRoom,
    onSuccess: (room) => onCreated(room),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    if (selected.size === 0 || mutation.isPending) return;
    const ids = Array.from(selected);
    mutation.mutate({
      memberIds: ids,
      name: groupName.trim() || undefined,
      isGroup: ids.length > 1,
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
          <label className="text-sm font-semibold text-fg">
            그룹 이름 (선택)
          </label>
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
              placeholder="이름 · 팀으로 검색"
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
                    <Avatar
                      name={m.name}
                      tone={avatarTone(m.avatarColor)}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-fg">
                        {m.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {m.team ?? "미지정"}
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
        {mutation.isError && (
          <p className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {getV2ErrorMessage(mutation.error)}
          </p>
        )}
        <button
          type="button"
          disabled={selected.size === 0 || mutation.isPending}
          onClick={confirm}
          className="w-full rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mutation.isPending
            ? "만드는 중…"
            : selected.size > 0
              ? `${selected.size}명 대화 시작`
              : "멤버를 선택하세요"}
        </button>
      </div>
    </>
  );
}

// ─────────────── Chat view ───────────────

function ChatView({
  room,
  meId,
  employeeMap,
  typingIds,
  wsConnected,
  wsSend,
  onBack,
  onClose,
  onOpenSettings,
}: {
  room: ChatRoomOut;
  meId: string | null;
  employeeMap: Map<string, EmployeeOut>;
  typingIds: Set<string>;
  wsConnected: boolean;
  wsSend: (frame: object) => boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const d = roomDisplay(room, meId, employeeMap);
  const subtitle = d.isGroup ? `그룹 · ${d.memberCount}명` : "1:1 대화";
  const canSend = draft.trim().length > 0;

  const messagesQuery = useQuery({
    queryKey: ["v2", "chat", "messages", room.id] as const,
    queryFn: () => listMessages(room.id, { limit: 50 }),
    // WS 연결시엔 폴링 off (실시간 수신). 없으면 백업 폴링.
    refetchInterval: wsConnected ? false : POLL_MS,
  });
  const messages = messagesQuery.data ?? [];

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(room.id, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "chat", "messages", room.id],
      });
      queryClient.invalidateQueries({ queryKey: ["v2", "chat", "rooms"] });
    },
  });

  // 방 열 때 read 마킹 (WS 있으면 프레임, 아니면 REST).
  const readMarkedRef = useRef(false);
  useEffect(() => {
    if (readMarkedRef.current) return;
    readMarkedRef.current = true;
    if (wsConnected && wsSend({ type: "read", roomId: room.id })) {
      queryClient.invalidateQueries({ queryKey: ["v2", "chat", "rooms"] });
      return;
    }
    markRoomRead(room.id)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["v2", "chat", "rooms"] }),
      )
      .catch(() => {
        // 실패 조용히
      });
  }, [room.id, queryClient, wsConnected, wsSend]);

  // 타이핑 send — draft 변경 시 즉시 true, 2초 정지 시 false.
  const lastTypingSentRef = useRef<boolean>(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEffect(() => {
    if (!wsConnected) return;
    if (draft.length > 0) {
      if (!lastTypingSentRef.current) {
        wsSend({ type: "typing", roomId: room.id, isTyping: true });
        lastTypingSentRef.current = true;
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(() => {
        wsSend({ type: "typing", roomId: room.id, isTyping: false });
        lastTypingSentRef.current = false;
      }, 2_000);
    } else if (lastTypingSentRef.current) {
      wsSend({ type: "typing", roomId: room.id, isTyping: false });
      lastTypingSentRef.current = false;
    }
    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
    };
  }, [draft, room.id, wsConnected, wsSend]);

  // 상대방 타이핑 이름 (나 제외).
  const typingNames = Array.from(typingIds)
    .filter((id) => id !== meId)
    .map((id) => employeeMap.get(id)?.name ?? "누군가")
    .slice(0, 3);

  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  function submit() {
    if (!canSend || sendMutation.isPending) return;
    const body = draft.trim();
    setDraft("");
    sendMutation.mutate(body);
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <RoundIconButton label="뒤로" onClick={onBack}>
          <ChevronLeftIcon className="size-4" />
        </RoundIconButton>
        <button
          type="button"
          onClick={onOpenSettings}
          className="group relative flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-card-hover"
        >
          <Avatar
            name={d.name}
            tone={d.tone}
            online={d.online}
            group={d.isGroup}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{d.name}</p>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </button>
        <RoundIconButton label="닫기" onClick={onClose}>
          <XMarkIcon className="size-4" />
        </RoundIconButton>
      </div>

      {messagesQuery.isLoading ? (
        <div className="flex-1 space-y-3 px-4 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-card-hover" />
          ))}
        </div>
      ) : messagesQuery.isError ? (
        <div className="flex-1 px-4 py-8 text-center text-sm text-red-300">
          {getV2ErrorMessage(messagesQuery.error)}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-card-hover">
            <ChatBubbleOvalLeftIcon className="size-6 text-muted" />
          </div>
          <p className="text-sm text-muted">첫 메시지를 보내볼까요?</p>
        </div>
      ) : (
        <ul
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              msg={m}
              me={m.senderId === meId}
              sender={employeeMap.get(m.senderId)}
              showAuthor={d.isGroup}
            />
          ))}
        </ul>
      )}

      <div className="border-t border-line px-4 py-3">
        {typingNames.length > 0 && (
          <p className="mb-1 flex items-center gap-1 text-xs text-muted">
            <TypingDots />
            <span className="tracking-tight">
              {typingNames.join(", ")} 입력 중…
            </span>
          </p>
        )}
        {sendMutation.isError && (
          <p className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {getV2ErrorMessage(sendMutation.error)}
          </p>
        )}
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
              disabled={sendMutation.isPending}
              className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            aria-label="보내기"
            disabled={!canSend || sendMutation.isPending}
            className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-all duration-200 ${
              canSend && !sendMutation.isPending
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

function MessageRow({
  msg,
  me,
  sender,
  showAuthor,
}: {
  msg: MessageOut;
  me: boolean;
  sender: EmployeeOut | undefined;
  showAuthor: boolean;
}) {
  const time = formatHM(msg.createdAt);
  return (
    <li
      className={`flex items-end gap-2 ${me ? "justify-end" : "justify-start"}`}
    >
      {!me && (
        <Avatar
          name={sender?.name ?? "?"}
          tone={avatarTone(sender?.avatarColor)}
          size="sm"
        />
      )}
      {me && (
        <div className="flex flex-col items-end">
          <span className="text-[11px] text-muted tabular-nums">{time}</span>
        </div>
      )}
      <div
        className={`flex max-w-[70%] flex-col ${me ? "items-end" : "items-start"}`}
      >
        {!me && showAuthor && (
          <span className="mb-0.5 text-[11px] text-muted">
            {sender?.name ?? "알 수 없음"}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
            me ? "bg-primary/25 text-fg" : "bg-card-hover text-fg"
          }`}
        >
          {msg.body}
        </div>
        {msg.reactions.length > 0 && (
          <div className="mt-1 flex gap-1">
            {msg.reactions.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs"
              >
                <span>{r.emoji}</span>
                <span className="tabular-nums text-primary">
                  {r.employeeIds.length}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      {!me && (
        <span className="text-[11px] text-muted tabular-nums">{time}</span>
      )}
    </li>
  );
}

// ─────────────── Settings view (읽기 전용 · 이름 변경/알림은 백엔드 미지원) ───────────────

function SettingsView({
  room,
  meId,
  employeeMap,
  onBack,
  onClose,
}: {
  room: ChatRoomOut;
  meId: string | null;
  employeeMap: Map<string, EmployeeOut>;
  onBack: () => void;
  onClose: () => void;
}) {
  const d = roomDisplay(room, meId, employeeMap);
  const [muted, setMuted] = useState(false);
  const members = room.memberIds
    .map((id) => employeeMap.get(id))
    .filter((e): e is EmployeeOut => !!e);

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
        <div className="flex flex-col items-center gap-3 pt-2">
          <Avatar
            name={d.name}
            tone={d.tone}
            online={d.online}
            group={d.isGroup}
            size="xl"
          />
          <p className="text-lg font-black tracking-tighter text-fg">
            {d.name}
          </p>
          <p className="text-xs text-muted">
            {d.isGroup ? `그룹 · ${d.memberCount}명` : "1:1 대화"}
          </p>
        </div>

        {/* 알림 (로컬 · 백엔드 저장 안 됨) */}
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

        {/* 멤버 */}
        <section>
          <p className="text-xs font-semibold text-muted">
            멤버 <span className="tabular-nums">{members.length}</span>
          </p>
          <ul className="mt-2 divide-y divide-line">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 py-3"
              >
                <Avatar
                  name={m.name}
                  tone={avatarTone(m.avatarColor)}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-fg">
                    {m.name}
                    {m.id === meId && (
                      <span className="ml-1 text-xs font-normal text-muted">
                        (나)
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {m.team ?? "미지정"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
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

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="inline-block size-1 animate-[typing_1.2s_ease-in-out_infinite] rounded-full bg-muted [animation-delay:0ms]" />
      <span className="inline-block size-1 animate-[typing_1.2s_ease-in-out_infinite] rounded-full bg-muted [animation-delay:200ms]" />
      <span className="inline-block size-1 animate-[typing_1.2s_ease-in-out_infinite] rounded-full bg-muted [animation-delay:400ms]" />
    </span>
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

// ISO → "오전 HH:MM" / "오후 HH:MM"
function formatHM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const isPM = h >= 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${isPM ? "오후" : "오전"} ${String(h12).padStart(2, "0")}:${m}`;
}

// ISO → "방금" / "N분 전" / "N시간 전" / "N일 전" / "M/D"
function timeAgoShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
