import { apiFetch } from "./client";
import type { Branch } from "./types";

// GET /branches — 지점 목록 (공개)
export function getBranches(): Promise<Branch[]> {
  return apiFetch<Branch[]>("/branches");
}

// 지점 등록·수정 입력
export interface BranchInput {
  name: string;
  phone: string;
  kakao_url: string | null;
  naver_place_url: string | null;
  // 알림톡 발송자 admin id (선택) — null 이면 미설정
  messenger_admin_id?: string | null;
  // 알림톡 발송 토글 (선택) — 카드에서 빠르게 끄고 켜기 위해 PATCH 전용으로도 사용
  messaging_enabled?: boolean;
}

// GET /admin/branches — 지점 목록 (SUPER_ADMIN)
export function getAdminBranches(): Promise<Branch[]> {
  return apiFetch<Branch[]>("/admin/branches", { auth: true });
}

// POST /admin/branches — 지점 등록 (SUPER_ADMIN)
export function createBranch(payload: BranchInput): Promise<Branch> {
  return apiFetch<Branch>("/admin/branches", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

// PATCH /admin/branches/{id} — 지점 수정 (SUPER_ADMIN)
export function updateBranch(
  id: string,
  payload: BranchInput,
): Promise<Branch> {
  return apiFetch<Branch>(`/admin/branches/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}
