import { apiFetch } from "./client";
import type {
  Page,
  PTApplication,
  PTApplicationCreate,
  PTApplicationReRegister,
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

// POST /pt-applications/re-register — PT 재등록 (공개).
// branch+name+phone 으로 기존 PT 신청 식별 → 404 면 본인 확인 실패.
export function reRegisterPtApplication(
  payload: PTApplicationReRegister,
): Promise<PTApplication> {
  return apiFetch<PTApplication>("/pt-applications/re-register", {
    method: "POST",
    body: payload,
  });
}

// GET /admin/pt-applications — PT 신청 목록 (관리자, 페이지네이션)
// 응답은 Page<PTApplication> envelope. 카운트·차트 등 집계는 /admin/dashboard/summary 사용.
export function getAdminPtApplications(opts: {
  branchId?: string;
  name?: string;
  phone?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Page<PTApplication>> {
  const params = new URLSearchParams();
  if (opts.branchId) params.set("branch_id", opts.branchId);
  if (opts.name) params.set("name", opts.name);
  if (opts.phone) params.set("phone", opts.phone);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<Page<PTApplication>>(
    `/admin/pt-applications${qs ? `?${qs}` : ""}`,
    { auth: true },
  );
}

// GET /admin/pt-applications/{id} — PT 신청 1건 조회 (알림 클릭 자동 상세 오픈)
export function getAdminPtApplication(id: string): Promise<PTApplication> {
  return apiFetch<PTApplication>(`/admin/pt-applications/${id}`, {
    auth: true,
  });
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
