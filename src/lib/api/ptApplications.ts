import { apiFetch } from "./client";
import type { PTApplication, PTApplicationCreate } from "./types";

// POST /pt-applications — PT 신청 (공개)
export function createPtApplication(
  payload: PTApplicationCreate,
): Promise<PTApplication> {
  return apiFetch<PTApplication>("/pt-applications", {
    method: "POST",
    body: payload,
  });
}

// GET /admin/pt-applications — PT 신청 목록 (관리자, FC는 자기 지점만)
export function getAdminPtApplications(): Promise<PTApplication[]> {
  return apiFetch<PTApplication[]>("/admin/pt-applications", { auth: true });
}

// DELETE /admin/pt-applications/{id} — PT 신청 삭제 (관리자)
export function deletePtApplication(id: string): Promise<void> {
  return apiFetch<void>(`/admin/pt-applications/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
