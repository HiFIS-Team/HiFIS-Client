import { apiFetch } from "./client";
import type { Branch } from "./types";

// GET /branches — 지점 목록.
// v1 은 공개, v2 는 auth 필요 + shape 다름. v2 백엔드 환경에서는 아직 어댑터 미완이라 실패 시 [] 로 조용히.
// 결과 : BranchProvider 가 empty branches 로 진행 (isReady=false), 셸은 정상 렌더.
export async function getBranches(): Promise<Branch[]> {
  try {
    return await apiFetch<Branch[]>("/branches");
  } catch {
    return [];
  }
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
