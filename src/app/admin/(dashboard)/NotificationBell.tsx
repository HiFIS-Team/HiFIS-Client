"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  BellIcon,
  BoltIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationLink,
  type AdminNotification,
} from "@/lib/api/notifications";
import { timeAgo } from "@/lib/format";

// 알림 타입별 아이콘 + 색상 — 한눈에 종류 구분.
// 미지정 타입은 기본 (BellIcon, gray)으로 폴백.
const NOTIFICATION_META: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    bgClass: string;
    iconClass: string;
  }
> = {
  RESERVATION: {
    icon: CalendarIcon,
    bgClass: "bg-blue-50",
    iconClass: "text-blue-500",
  },
  MEMBER: {
    icon: UsersIcon,
    bgClass: "bg-green-50",
    iconClass: "text-green-500",
  },
  PT_APPLICATION: {
    icon: BoltIcon,
    bgClass: "bg-violet-50",
    iconClass: "text-primary",
  },
  FC_SIGNUP: {
    icon: UserPlusIcon,
    bgClass: "bg-amber-50",
    iconClass: "text-amber-500",
  },
  // 백엔드가 EXPIRY 같은 추가 타입 보낼 수도 있어 폴백 둠
  EXPIRY: {
    icon: ClockIcon,
    bgClass: "bg-rose-50",
    iconClass: "text-rose-500",
  },
};
const FALLBACK_META = {
  icon: BellIcon,
  bgClass: "bg-gray-100",
  iconClass: "text-gray-500",
};

// 뱃지 폴링 간격 (밀리초). 30초마다 unread-count 재조회.
const POLL_MS = 30_000;

// 헤더의 알림 벨 — 클릭하면:
//   PC    : 아래로 떨어지는 dropdown 패널 (헤더 우측 끝 기준).
//   모바일 : layout 의 notificationOpen state 를 켜 MobileSubPage 슬라이드 인.
// 미읽음 카운트는 30초마다 폴링.
export function NotificationBell({
  onMobileOpen,
}: {
  // 모바일에서 벨 누르면 호출 — layout 이 MobileSubPage 오버레이를 띄움.
  onMobileOpen: () => void;
}) {
  const queryClient = useQueryClient();
  // PC dropdown 열림 상태. 모바일에선 오버레이라 따로 안 씀.
  const [pcOpen, setPcOpen] = useState(false);

  // 미읽음 개수 — 폴링 (드롭다운 닫혀도 30초마다 갱신해서 뱃지 업데이트)
  const unreadCountQuery = useQuery({
    queryKey: ["admin", "notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const unreadCount = unreadCountQuery.data?.count ?? 0;

  // 패널 열면 모두 읽음 처리 — PC dropdown 열 때 트리거.
  // 모바일 오버레이는 NotificationsBody 자체가 mount 시 처리.
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications"],
      }),
  });

  function handleBellClick() {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      if (pcOpen) {
        setPcOpen(false);
      } else {
        setPcOpen(true);
        if (unreadCount > 0) markAllReadMutation.mutate();
      }
    } else {
      onMobileOpen();
    }
  }

  // PC dropdown 외부 클릭 감지 — fixed 백드롭은 부모(Sidebar)의 transform 때문에
  // viewport 밖 전체를 못 덮어서 우측 메인 콘텐츠 클릭이 잡히지 않음 →
  // document pointerdown 으로 처리.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pcOpen) return;
    function handle(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPcOpen(false);
      }
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [pcOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleBellClick}
        aria-label="알림"
        className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* PC 전용 dropdown — 모바일에선 lg:block 으로 숨고 오버레이가 대신.
          모바일 케이스에선 handleBellClick 이 setPcOpen 안 부르니까 mount 자체
          안 되지만, 안전하게 lg:block 으로 한 번 더 차단. */}
      {pcOpen && (
        <div className="animate-panel-in absolute top-full right-0 z-50 mt-2 hidden w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg lg:block">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-bold text-gray-900">알림</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <NotificationsList onItemClick={() => setPcOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// MobileSubPage 안에서 쓰이는 알림 본문 — 헤더(MobileSubPage 가 자체 제공) 없이
// 리스트 영역만. PC dropdown 의 내용물과 동일 컴포넌트(NotificationsList) 사용.
export function NotificationsBody({ onItemClick }: { onItemClick?: () => void }) {
  // mount 시 모두 읽음 처리 — 모바일 오버레이가 열리는 시점.
  const queryClient = useQueryClient();
  const unreadCountQuery = useQuery({
    queryKey: ["admin", "notifications", "unread-count"],
    queryFn: getUnreadCount,
  });
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications"],
      }),
  });
  // mount 1회만 — 이미 비어 있으면 호출 안 함.
  const markedRef = useRef(false);
  useEffect(() => {
    if (markedRef.current) return;
    const unread = unreadCountQuery.data?.count ?? 0;
    if (unread > 0) {
      markedRef.current = true;
      markAllReadMutation.mutate();
    }
  }, [unreadCountQuery.data?.count, markAllReadMutation]);

  return <NotificationsList onItemClick={onItemClick} />;
}

// 알림 리스트 — PC dropdown 내부 / 모바일 오버레이 내부 공용.
// 항목 클릭 시 onItemClick 으로 컨테이너(드롭다운/오버레이) 즉시 close.
function NotificationsList({ onItemClick }: { onItemClick?: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["admin", "notifications", "list", "first-page"],
    queryFn: () => getNotifications({ page: 1, pageSize: 20 }),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const notifications = listQuery.data?.items ?? [];

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications"],
      }),
  });

  function handleItemClick(n: AdminNotification) {
    onItemClick?.();
    if (!n.is_read) markReadMutation.mutate(n.id);
    const link = notificationLink(n.source_type);
    if (!link) return;
    // 회원·PT 는 상세 다이얼로그가 있어 ?detail=<id> 로 자동 오픈 (sw.ts 와 동일 규칙)
    const withDetail =
      n.source_id &&
      (n.source_type === "MEMBER" || n.source_type === "PT_APPLICATION")
        ? `${link}?detail=${encodeURIComponent(n.source_id)}`
        : link;
    router.push(withDetail);
  }

  if (listQuery.isLoading) {
    return (
      <NotificationMessage
        icon={ArrowPathIcon}
        iconBgClass="bg-gray-100"
        iconClass="text-gray-400 animate-spin"
      >
        불러오는 중…
      </NotificationMessage>
    );
  }
  if (listQuery.isError) {
    return (
      <NotificationMessage
        icon={ExclamationTriangleIcon}
        iconBgClass="bg-amber-50"
        iconClass="text-amber-500"
      >
        알림을 불러오지 못했습니다.
      </NotificationMessage>
    );
  }
  if (notifications.length === 0) {
    return (
      <NotificationMessage
        icon={InboxIcon}
        iconBgClass="bg-gray-100"
        iconClass="text-gray-400"
      >
        새 알림이 없습니다.
      </NotificationMessage>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {notifications.map((n) => {
        const meta = NOTIFICATION_META[n.source_type] ?? FALLBACK_META;
        const Icon = meta.icon;
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => handleItemClick(n)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                n.is_read ? "" : "bg-violet-50/60"
              }`}
            >
              {/* 타입별 아이콘 칩 */}
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.bgClass}`}
              >
                <Icon className={`size-5 ${meta.iconClass}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="block text-sm font-semibold text-gray-900">
                    {n.title}
                  </span>
                  {!n.is_read && (
                    <span
                      className="inline-block size-1.5 shrink-0 rounded-full bg-primary"
                      aria-label="안 읽음"
                    />
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {n.body}
                </span>
                <span className="mt-1 block text-[11px] text-gray-400">
                  {timeAgo(n.created_at)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// 알림 리스트의 로딩/에러/빈 상태 — 작은 칩 + 메시지 (TableMessage 와 동일 톤, 좁은 패널용 축소)
function NotificationMessage({
  icon: Icon,
  iconBgClass,
  iconClass,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-gray-500">
      <div
        className={`flex size-9 items-center justify-center rounded-full ${iconBgClass}`}
      >
        <Icon className={`size-5 ${iconClass}`} />
      </div>
      <p>{children}</p>
    </div>
  );
}
