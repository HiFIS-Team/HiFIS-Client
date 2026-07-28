import { apiV2Fetch } from "./client";

// 알림 — backend-api.md §9.4.
// 본인 것만 조회. type 은 자유형 (ATTENDANCE · LEAVE · NOTICE · CHAT · APPROVAL · PROJECT · PAYROLL 등).
// link 는 백엔드가 앱 기준 상대 경로로 채워옴 (예: "/notices"). 프론트 라우팅 시 "/admin" prefix 붙임.

export interface NotificationOut {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string; // ISO
}

export interface ListNotificationsParams {
  read?: boolean; // undefined = 전체, false = 안 읽음만, true = 읽음만
}

export function listNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationOut[]> {
  const qs = new URLSearchParams();
  if (params.read !== undefined) qs.set("read", String(params.read));
  const query = qs.toString();
  return apiV2Fetch<NotificationOut[]>(
    `/notifications${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

export function markNotificationRead(id: string): Promise<NotificationOut> {
  return apiV2Fetch<NotificationOut>(`/notifications/${id}/read`, {
    method: "POST",
    auth: true,
  });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiV2Fetch<void>(`/notifications/read-all`, {
    method: "POST",
    auth: true,
  });
}

// 백엔드 link (예: "/notices") → 어드민 경로.
// null 은 라우팅 없음.
export function notificationHref(link: string | null): string | null {
  if (!link) return null;
  // 이미 /admin 으로 시작하면 그대로.
  if (link.startsWith("/admin")) return link;
  // 절대 URL 은 그대로 (외부 링크).
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  // 상대 경로면 /admin prefix.
  return `/admin${link.startsWith("/") ? link : `/${link}`}`;
}
