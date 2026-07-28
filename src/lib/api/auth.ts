import { apiFetch } from "./client";
import { getMe as getMeV2 } from "./v2/auth";
import type { EmployeeOut } from "./v2/types";
import type { Admin, AdminSignupRequest, TokenResponse } from "./types";

// 관리자 인증 API — 로그인/가입/인증은 공개, /me 는 Bearer 필요.

// POST /admin/login — 로그인 (ACTIVE 상태만 가능)
export function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/admin/login", {
    method: "POST",
    body: { email, password },
  });
}

// POST /admin/signup — FC 셀프 회원가입 (계정 생성 + 인증 메일 발송)
export function signup(payload: AdminSignupRequest): Promise<Admin> {
  return apiFetch<Admin>("/admin/signup", { method: "POST", body: payload });
}

// POST /admin/verify-email — 6자리 인증번호 검증
export function verifyEmail(email: string, code: string): Promise<Admin> {
  return apiFetch<Admin>("/admin/verify-email", {
    method: "POST",
    body: { email, code },
  });
}

// POST /admin/resend-verification — 인증번호 재발송
export function resendVerification(email: string): Promise<void> {
  return apiFetch<void>("/admin/resend-verification", {
    method: "POST",
    body: { email },
  });
}

// POST /admin/password-reset/request — 비번 재설정 인증번호 발송
export function requestPasswordReset(email: string): Promise<void> {
  return apiFetch<void>("/admin/password-reset/request", {
    method: "POST",
    body: { email },
  });
}

// POST /admin/password-reset/confirm — 인증번호 + 새 비번으로 확정
export function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return apiFetch<void>("/admin/password-reset/confirm", {
    method: "POST",
    body: { email, code, new_password: newPassword },
  });
}

// GET /auth/me (v2) — v1 Admin shape 로 어댑팅.
// 앱 곳곳(대시보드/BranchProvider/staff 페이지 등)이 아직 v1 Admin 타입을 참조 →
// 여기서 어댑터를 두면 페이지 재작성 없이도 v2 로 안전하게 이전됨.
// v2 → v1 매핑:
//   role : ADMIN → SUPER_ADMIN · 그 외 → FC
//   branchId → branch_id · joinedAt → created_at · lastActiveAt → last_seen_at
//   position/status/is_online : v2 스키마엔 없음 → 임시 기본값
export async function getMe(): Promise<Admin> {
  const emp = await getMeV2();
  return adaptEmployeeToAdmin(emp);
}

function adaptEmployeeToAdmin(e: EmployeeOut): Admin {
  return {
    id: e.id,
    email: e.email,
    name: e.name,
    role: e.role === "ADMIN" ? "SUPER_ADMIN" : "FC",
    position: null,
    status: "ACTIVE",
    branch_id: e.branchId ?? null,
    created_at: e.joinedAt,
    last_seen_at: e.lastActiveAt ?? null,
    is_online: true,
  };
}

// PATCH /admin/me/password — 로그인 상태에서 비밀번호 변경 (현재 비번 확인 필요)
export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return apiFetch<void>("/admin/me/password", {
    method: "PATCH",
    body: { current_password: currentPassword, new_password: newPassword },
    auth: true,
  });
}

// POST /admin/me/heartbeat — 접속 신호 (204).
// 프론트가 60초마다 ping → 백엔드가 last_seen_at 갱신 → SUPER_ADMIN 목록에서 is_online 으로 보임.
export function postHeartbeat(): Promise<void> {
  return apiFetch<void>("/admin/me/heartbeat", {
    method: "POST",
    auth: true,
  });
}
