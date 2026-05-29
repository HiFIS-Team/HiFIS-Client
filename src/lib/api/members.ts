import { apiFetch } from "./client";
import type { Member, MemberCreate, MemberUpdate, Page } from "./types";

// POST /members — 회원가입 신청 (공개)
export function createMember(payload: MemberCreate): Promise<Member> {
  return apiFetch<Member>("/members", { method: "POST", body: payload });
}

// GET /admin/members — 회원 목록 조회 (관리자, 페이지네이션)
// 응답은 Page<Member> envelope. 카운트·차트 등 집계는 /admin/dashboard/summary 사용.
// branchId 지정 시 해당 지점만 (SUPER_ADMIN 필터용). FC는 토큰 기준 자동 분기.
// name·phone 은 백엔드의 부분일치(ilike/like) 검색 — 둘 다 주면 AND.
export function getAdminMembers(opts: {
  branchId?: string;
  name?: string;
  phone?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Page<Member>> {
  const params = new URLSearchParams();
  if (opts.branchId) params.set("branch_id", opts.branchId);
  if (opts.name) params.set("name", opts.name);
  if (opts.phone) params.set("phone", opts.phone);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<Page<Member>>(`/admin/members${qs ? `?${qs}` : ""}`, {
    auth: true,
  });
}

// GET /admin/members/{id} — 회원 1건 조회 (알림 클릭으로 상세 다이얼로그 자동 오픈에 사용)
export function getAdminMember(id: string): Promise<Member> {
  return apiFetch<Member>(`/admin/members/${id}`, { auth: true });
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
