import { apiFetch } from "./client";
import type {
  Page,
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
