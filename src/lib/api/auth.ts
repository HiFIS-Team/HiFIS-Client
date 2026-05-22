import { apiFetch } from "./client";
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

// GET /admin/me — 현재 로그인한 관리자 정보 (Bearer)
export function getMe(): Promise<Admin> {
  return apiFetch<Admin>("/admin/me", { auth: true });
}
