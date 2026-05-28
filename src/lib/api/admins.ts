import { apiFetch } from "./client";
import type { Admin } from "./types";

// GET /admin/admins — 관리자 목록 (SUPER_ADMIN).
// branchId 주면 해당 지점 소속 admin 만 필터.
export function getAdmins(branchId?: string): Promise<Admin[]> {
  const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : "";
  return apiFetch<Admin[]>(`/admin/admins${query}`, { auth: true });
}

// POST /admin/admins/{id}/approve — FC 가입 승인 (PENDING_APPROVAL → ACTIVE)
export function approveAdmin(id: string): Promise<Admin> {
  return apiFetch<Admin>(`/admin/admins/${id}/approve`, {
    method: "POST",
    auth: true,
  });
}

// POST /admin/admins/{id}/reject — FC 가입 거부 (대기 계정 삭제)
export function rejectAdmin(id: string): Promise<void> {
  return apiFetch<void>(`/admin/admins/${id}/reject`, {
    method: "POST",
    auth: true,
  });
}

// DELETE /admin/admins/{id} — FC 계정 삭제 (SUPER_ADMIN)
export function deleteAdmin(id: string): Promise<void> {
  return apiFetch<void>(`/admin/admins/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
