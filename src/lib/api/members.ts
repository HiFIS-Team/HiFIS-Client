import { apiFetch } from "./client";
import type { Member, MemberCreate, MemberUpdate } from "./types";

// POST /members — 회원가입 신청 (공개)
export function createMember(payload: MemberCreate): Promise<Member> {
  return apiFetch<Member>("/members", { method: "POST", body: payload });
}

// GET /admin/members — 회원 목록 조회 (관리자, FC는 자기 지점만)
export function getAdminMembers(): Promise<Member[]> {
  return apiFetch<Member[]>("/admin/members", { auth: true });
}

// DELETE /admin/members/{id} — 회원 삭제 (관리자)
export function deleteMember(id: string): Promise<void> {
  return apiFetch<void>(`/admin/members/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// PATCH /admin/members/{id} — 회원 정보 수정 (관리자)
export function updateMember(
  id: string,
  payload: MemberUpdate,
): Promise<Member> {
  return apiFetch<Member>(`/admin/members/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}
