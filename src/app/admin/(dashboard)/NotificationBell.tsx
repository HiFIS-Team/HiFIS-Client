"use client";

import { useState, type ComponentType, type ReactNode } from "react";
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

// 사이드바 헤더의 알림 벨 — 클릭하면 알림 목록 패널이 열린다.
// 읽음 상태·미읽음 카운트 모두 백엔드 (Phase B-2 정합 후).
export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // 미읽음 개수 — 폴링 (드롭다운 닫혀도 30초마다 갱신해서 뱃지 업데이트)
  const unreadCountQuery = useQuery({
    queryKey: ["admin", "notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const unreadCount = unreadCountQuery.data?.count ?? 0;

  // 패널 열린 동안만 목록 조회 — 닫혀있으면 폴링 안 함 (불필요한 트래픽)
  const listQuery = useQuery({
    queryKey: ["admin", "notifications", "list", "first-page"],
    queryFn: () => getNotifications({ page: 1, pageSize: 20 }),
    enabled: open,
    refetchInterval: open ? POLL_MS : false,
  });
  const notifications = listQuery.data?.items ?? [];

  // 캐시 무효화 — 읽음 처리·전체 읽음 후 호출
  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin", "notifications", "unread-count"],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin", "notifications", "list"],
    });
  };

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });

  function openPanel() {
    setOpen(true);
    // 패널 열면 모두 읽음 처리 (이전 클라이언트-사이드 트래킹과 동일 UX)
    if (unreadCount > 0) markAllReadMutation.mutate();
  }

  function handleItemClick(n: AdminNotification) {
    setOpen(false);
    if (!n.is_read) markReadMutation.mutate(n.id);
    const link = notificationLink(n.source_type);
    if (link) router.push(link);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
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

      {open && (
        <>
          {/* 바깥 클릭 시 닫기 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* 모바일(상단바 우측): 우측 정렬·화면 안에 가두기. 데스크탑(사이드바 좌측): 좌측 정렬. */}
          <div className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg lg:right-auto lg:left-0">
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-bold text-gray-900">알림</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {listQuery.isLoading ? (
                <NotificationMessage
                  icon={ArrowPathIcon}
                  iconBgClass="bg-gray-100"
                  iconClass="text-gray-400 animate-spin"
                >
                  불러오는 중…
                </NotificationMessage>
              ) : listQuery.isError ? (
                <NotificationMessage
                  icon={ExclamationTriangleIcon}
                  iconBgClass="bg-amber-50"
                  iconClass="text-amber-500"
                >
                  알림을 불러오지 못했습니다.
                </NotificationMessage>
              ) : notifications.length === 0 ? (
                <NotificationMessage
                  icon={InboxIcon}
                  iconBgClass="bg-gray-100"
                  iconClass="text-gray-400"
                >
                  새 알림이 없습니다.
                </NotificationMessage>
              ) : (
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
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 알림 패널의 로딩/에러/빈 상태 — 작은 칩 + 메시지 (TableMessage 와 동일 톤, 좁은 패널용 축소)
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
