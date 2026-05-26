import { apiFetch } from "./client";
import type { Page } from "./types";

// 관리자 알림 (DB 기반, Phase B-2 정합 후)
// 백엔드가 source_type 으로 부여한 카테고리를 그대로 받아 표시·라우팅에 사용.
export interface AdminNotification {
  id: string;
  admin_id: string;
  source_type: string; // RESERVATION | MEMBER | PT_APPLICATION | FC_SIGNUP
  source_id: string;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// source_type → 클릭 시 이동할 어드민 경로. 백엔드가 link 를 별도로 안 주므로 프론트가 매핑.
export function notificationLink(sourceType: string): string | null {
  switch (sourceType) {
    case "RESERVATION":
      return "/admin/reservations";
    case "MEMBER":
      return "/admin/members";
    case "PT_APPLICATION":
      return "/admin/pt-applications";
    case "FC_SIGNUP":
      return "/admin/admins";
    default:
      return null;
  }
}

// GET /admin/notifications — 본인 알림 목록 (페이지네이션)
export function getNotifications(opts: {
  isRead?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<Page<AdminNotification>> {
  const params = new URLSearchParams();
  if (opts.isRead !== undefined) params.set("is_read", String(opts.isRead));
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<Page<AdminNotification>>(
    `/admin/notifications${qs ? `?${qs}` : ""}`,
    { auth: true },
  );
}

// GET /admin/notifications/unread-count — 본인 미읽음 개수 (헤더 뱃지용)
export function getUnreadCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/admin/notifications/unread-count", {
    auth: true,
  });
}

// PATCH /admin/notifications/{id}/read — 1건 읽음
export function markNotificationRead(id: string): Promise<void> {
  return apiFetch<void>(`/admin/notifications/${id}/read`, {
    method: "PATCH",
    auth: true,
  });
}

// POST /admin/notifications/mark-all-read — 전체 읽음
export function markAllNotificationsRead(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/admin/notifications/mark-all-read", {
    method: "POST",
    auth: true,
  });
}
