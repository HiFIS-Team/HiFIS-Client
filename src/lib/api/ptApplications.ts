import { apiFetch } from "./client";
import type {
  PTApplication,
  PTApplicationCreate,
  PTApplicationUpdate,
} from "./types";

// POST /pt-applications — PT 신청 (공개)
export function createPtApplication(
  payload: PTApplicationCreate,
): Promise<PTApplication> {
  return apiFetch<PTApplication>("/pt-applications", {
    method: "POST",
    body: payload,
  });
}

// GET /admin/pt-applications — PT 신청 목록 (관리자)
// branchId 지정 시 해당 지점만 (SUPER_ADMIN 필터용). FC는 토큰 기준 자동 분기.
// name·phone 은 백엔드의 부분일치(ilike/like) 검색에 사용 — 둘 다 주면 AND.
export function getAdminPtApplications(
  branchId?: string,
  name?: string,
  phone?: string,
): Promise<PTApplication[]> {
  const params = new URLSearchParams();
  if (branchId) params.set("branch_id", branchId);
  if (name) params.set("name", name);
  if (phone) params.set("phone", phone);
  const qs = params.toString();
  return apiFetch<PTApplication[]>(
    `/admin/pt-applications${qs ? `?${qs}` : ""}`,
    { auth: true },
  );
}

// DELETE /admin/pt-applications/{id} — PT 신청 삭제 (관리자)
export function deletePtApplication(id: string): Promise<void> {
  return apiFetch<void>(`/admin/pt-applications/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// PATCH /admin/pt-applications/{id} — PT 신청 정보 수정 (관리자)
export function updatePtApplication(
  id: string,
  payload: PTApplicationUpdate,
): Promise<PTApplication> {
  return apiFetch<PTApplication>(`/admin/pt-applications/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}
