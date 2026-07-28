import { apiV2Fetch } from "./client";
import { clearSession } from "./tokenStore";
import type { EmployeeOut, SignupResponse, TokenResponse } from "./types";

// v2 인증 API (backend-api.md §3).
// 규칙 : 로그인/가입/refresh 는 공개, /auth/me 는 Bearer 필요.

// POST /auth/login — 로그인. 응답에 employee 포함 → /auth/me 재호출 불필요.
export function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return apiV2Fetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

// POST /auth/signup — 회원가입 (2갈래):
//   inviteKey 유효 → { result: "JOINED" } · 즉시 Employee 생성, 토큰은 안 줌 → 로그인 필요.
//   inviteKey 없음/무효 → { result: "PENDING" } · JoinRequest 생성, 관리자 승인 대기.
export function signup(payload: {
  name: string;
  email: string;
  password: string;
  inviteKey?: string;
}): Promise<SignupResponse> {
  return apiV2Fetch<SignupResponse>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

// GET /auth/me — Bearer, 내 프로필.
export function getMe(): Promise<EmployeeOut> {
  return apiV2Fetch<EmployeeOut>("/auth/me", { auth: true });
}

// POST /auth/logout — 백엔드 no-op (refresh 블록리스트 미구현, §12).
// 프론트에서 세션(access + refresh) 파기로 처리.
export function logout(): void {
  clearSession();
}
