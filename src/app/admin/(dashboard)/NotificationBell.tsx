"use client";

import {
  useEffect,
  useMemo,
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
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  InboxIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationHref,
  type NotificationOut,
} from "@/lib/api/v2/notifications";
import { timeAgo } from "@/lib/format";

// v2 알림 type 별 아이콘·톤. 미정의는 fallback (BellIcon).
const NOTIFICATION_META: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    bgClass: string;
    iconClass: string;
  }
> = {
  ATTENDANCE: {
    icon: ClockIcon,
    bgClass: "bg-emerald-500/15",
    iconClass: "text-emerald-300",
  },
  LEAVE: {
    icon: ClockIcon,
    bgClass: "bg-amber-500/15",
    iconClass: "text-amber-300",
  },
  NOTICE: {
    icon: MegaphoneIcon,
    bgClass: "bg-blue-500/15",
    iconClass: "text-blue-300",
  },
  CHAT: {
    icon: ChatBubbleLeftRightIcon,
    bgClass: "bg-primary/15",
    iconClass: "text-primary",
  },
  APPROVAL: {
    icon: BriefcaseIcon,
    bgClass: "bg-violet-500/15",
    iconClass: "text-violet-300",
  },
  PROJECT: {
    icon: FolderIcon,
    bgClass: "bg-orange-500/15",
    iconClass: "text-orange-300",
  },
  PAYROLL: {
    icon: CurrencyDollarIcon,
    bgClass: "bg-green-500/15",
    iconClass: "text-green-300",
  },
};
const FALLBACK_META = {
  icon: BellIcon,
  bgClass: "bg-card-hover",
  iconClass: "text-muted",
};

// 폴링 30초.
const POLL_MS = 30_000;

export function NotificationBell({
  onMobileOpen,
}: {
  onMobileOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const [pcOpen, setPcOpen] = useState(false);

  // 안 읽은 것만 별도 쿼리 (뱃지용).
  const unreadQuery = useQuery({
    queryKey: ["v2", "notifications", { read: false }] as const,
    queryFn: () => listNotifications({ read: false }),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const unreadCount = unreadQuery.data?.length ?? 0;

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["v2", "notifications"] }),
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

  // PC dropdown 외부 클릭 감지.
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
        className="relative rounded-md p-1.5 text-muted hover:bg-card-hover hover:text-fg"
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {pcOpen && (
        <div className="animate-panel-in absolute top-full right-0 z-50 mt-2 hidden w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-card shadow-lg lg:block">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-fg">알림</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <NotificationsList onItemClick={() => setPcOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// 모바일 오버레이 안에서 쓰이는 알림 본문.
export function NotificationsBody({
  onItemClick,
}: {
  onItemClick?: () => void;
}) {
  const queryClient = useQueryClient();
  const unreadQuery = useQuery({
    queryKey: ["v2", "notifications", { read: false }] as const,
    queryFn: () => listNotifications({ read: false }),
  });
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["v2", "notifications"] }),
  });
  const markedRef = useRef(false);
  useEffect(() => {
    if (markedRef.current) return;
    const unread = unreadQuery.data?.length ?? 0;
    if (unread > 0) {
      markedRef.current = true;
      markAllReadMutation.mutate();
    }
  }, [unreadQuery.data?.length, markAllReadMutation]);

  return <NotificationsList onItemClick={onItemClick} />;
}

function NotificationsList({ onItemClick }: { onItemClick?: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 최근 20개 (백엔드가 정렬 desc). 폴링.
  const listQuery = useQuery({
    queryKey: ["v2", "notifications", "list"] as const,
    queryFn: () => listNotifications({}),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const notifications = useMemo(
    () => (listQuery.data ?? []).slice(0, 20),
    [listQuery.data],
  );

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["v2", "notifications"] }),
  });

  function handleItemClick(n: NotificationOut) {
    onItemClick?.();
    if (!n.read) markReadMutation.mutate(n.id);
    const href = notificationHref(n.link);
    if (href) router.push(href);
  }

  if (listQuery.isLoading) {
    return (
      <NotificationMessage
        icon={ArrowPathIcon}
        iconBgClass="bg-card-hover"
        iconClass="text-muted animate-spin"
      >
        불러오는 중…
      </NotificationMessage>
    );
  }
  if (listQuery.isError) {
    return (
      <NotificationMessage
        icon={ExclamationTriangleIcon}
        iconBgClass="bg-amber-500/15"
        iconClass="text-amber-300"
      >
        알림을 불러오지 못했습니다.
      </NotificationMessage>
    );
  }
  if (notifications.length === 0) {
    return (
      <NotificationMessage
        icon={InboxIcon}
        iconBgClass="bg-card-hover"
        iconClass="text-muted"
      >
        새 알림이 없습니다.
      </NotificationMessage>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {notifications.map((n) => {
        const meta = NOTIFICATION_META[n.type] ?? FALLBACK_META;
        const Icon = meta.icon;
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => handleItemClick(n)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-card-hover ${
                n.read ? "" : "bg-primary/15"
              }`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.bgClass}`}
              >
                <Icon className={`size-5 ${meta.iconClass}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="block text-sm font-semibold text-fg">
                    {n.title}
                  </span>
                  {!n.read && (
                    <span
                      className="inline-block size-1.5 shrink-0 rounded-full bg-primary"
                      aria-label="안 읽음"
                    />
                  )}
                </span>
                {n.body && (
                  <span className="mt-0.5 block text-xs text-muted">
                    {n.body}
                  </span>
                )}
                <span className="mt-1 block text-[11px] text-muted">
                  {timeAgo(n.createdAt)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted">
      <div
        className={`flex size-9 items-center justify-center rounded-full ${iconBgClass}`}
      >
        <Icon className={`size-5 ${iconClass}`} />
      </div>
      <p>{children}</p>
    </div>
  );
}
