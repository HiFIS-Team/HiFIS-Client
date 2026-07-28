import { apiV2Fetch } from "./client";

// /notices — backend-api.md §9.
// 작성=인증(전 직원), 수정/삭제=ADMIN·MANAGER.
// 응답은 pinned desc, created_at desc 로 이미 정렬되어 옴.
// POST 시 백엔드가 재직 중 전 직원에게 알림 · 웹푸시 자동 발송 (본인 제외).

export interface ReactionAgg {
  emoji: string;
  employeeIds: string[];
}

export interface NoticeOut {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorId: string;
  createdAt: string; // ISO
  reactions: ReactionAgg[];
}

export interface NoticeCreate {
  title: string;
  body: string;
  pinned?: boolean;
}

export interface NoticeUpdate {
  title?: string;
  body?: string;
  pinned?: boolean;
}

export function listNotices(): Promise<NoticeOut[]> {
  return apiV2Fetch<NoticeOut[]>(`/notices`, { auth: true });
}

export function createNotice(payload: NoticeCreate): Promise<NoticeOut> {
  return apiV2Fetch<NoticeOut>(`/notices`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function updateNotice(
  id: string,
  payload: NoticeUpdate,
): Promise<NoticeOut> {
  return apiV2Fetch<NoticeOut>(`/notices/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export function deleteNotice(id: string): Promise<void> {
  return apiV2Fetch<void>(`/notices/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
