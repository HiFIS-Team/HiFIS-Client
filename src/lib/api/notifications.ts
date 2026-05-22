import { apiFetch } from "./client";

// 관리자 알림 (GET /admin/notifications)
// 알림 생성·푸시 발송(웹푸시·폰)은 백엔드 알림 시스템으로 추후 구현 — 프론트는 조회·표시만.
export interface AdminNotification {
  id: string;
  // RESERVATION | MEMBER | PT_APPLICATION | FC_SIGNUP | EXPIRY ...
  type: string;
  title: string;
  body: string;
  // 클릭 시 이동할 관리자 화면 경로 (없으면 null)
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// GET /admin/notifications — 로그인한 관리자 본인의 알림 목록
export function getNotifications(): Promise<AdminNotification[]> {
  return apiFetch<AdminNotification[]>("/admin/notifications", { auth: true });
}
