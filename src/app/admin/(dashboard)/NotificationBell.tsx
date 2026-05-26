"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  BellIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import {
  getNotifications,
  type AdminNotification,
} from "@/lib/api/notifications";
import { timeAgo } from "@/lib/format";

// 사이드바 헤더의 알림 벨 — 클릭하면 알림 목록 패널이 열린다.
// 실제 푸시 발송(웹푸시·폰)은 백엔드 알림 시스템으로 추후 구현.
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // 패널을 연 뒤 읽음 처리한 알림 id.
  // 백엔드 읽음 상태 API가 생기기 전까지는 클라이언트에서만 추적한다.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: getNotifications,
  });

  const notifications = data ?? [];
  const isRead = (n: AdminNotification) => n.is_read || readIds.has(n.id);
  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  function openPanel() {
    setOpen(true);
    // 연 시점의 알림을 모두 읽음 처리 → 배지 사라짐
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function handleItemClick(n: AdminNotification) {
    setOpen(false);
    if (n.link) router.push(n.link);
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
          <div className="absolute top-full left-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-bold text-gray-900">알림</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <NotificationMessage
                  icon={ArrowPathIcon}
                  iconBgClass="bg-gray-100"
                  iconClass="text-gray-400 animate-spin"
                >
                  불러오는 중…
                </NotificationMessage>
              ) : isError ? (
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
                    const read = isRead(n);
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleItemClick(n)}
                          className={`flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                            read ? "" : "bg-violet-50/60"
                          }`}
                        >
                          <span
                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                              read ? "bg-transparent" : "bg-primary"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-gray-900">
                              {n.title}
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
