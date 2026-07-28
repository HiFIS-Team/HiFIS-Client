import { apiV2Fetch } from "./client";

// /accounts — backend-api.md §9.
// 비번은 응답에 없음. 열람은 GET /{id}/secret (owner 또는 ADMIN, 접근 로그 남음).
// 수정/삭제도 owner 또는 ADMIN. 프론트는 v1 me id/role 로 판단.

export type AccountScope = "전사" | "팀" | "프로젝트";

export interface AccountOut {
  id: string;
  name: string;
  cat: string; // 프론트 정의 카테고리 (소셜/편집/광고/예약)
  scope: AccountScope;
  loginId: string;
  url?: string | null;
  ownerId: string;
  memo?: string | null;
  active: boolean;
}

export interface AccountCreate {
  name: string;
  cat: string;
  scope: AccountScope;
  loginId: string;
  password: string; // 입력 전용 — 서버가 암호화
  url?: string | null;
  memo?: string | null;
  active?: boolean;
}

export interface AccountUpdate {
  name?: string;
  cat?: string;
  scope?: AccountScope;
  loginId?: string;
  password?: string; // 주면 재암호화
  url?: string | null;
  memo?: string | null;
  active?: boolean;
}

export interface AccountSecretOut {
  password: string;
}

export interface ListAccountsParams {
  scope?: AccountScope;
  cat?: string;
  q?: string;
}

export function listAccounts(
  params: ListAccountsParams = {},
): Promise<AccountOut[]> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set("scope", params.scope);
  if (params.cat) qs.set("cat", params.cat);
  if (params.q) qs.set("q", params.q);
  const query = qs.toString();
  return apiV2Fetch<AccountOut[]>(`/accounts${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function getAccount(id: string): Promise<AccountOut> {
  return apiV2Fetch<AccountOut>(`/accounts/${id}`, { auth: true });
}

export function createAccount(payload: AccountCreate): Promise<AccountOut> {
  return apiV2Fetch<AccountOut>(`/accounts`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function updateAccount(
  id: string,
  payload: AccountUpdate,
): Promise<AccountOut> {
  return apiV2Fetch<AccountOut>(`/accounts/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export function deleteAccount(id: string): Promise<void> {
  return apiV2Fetch<void>(`/accounts/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// 비번 열람 — 접근 로그가 남음. UI 에서 열람 확인 프롬프트 권장.
export function getAccountSecret(id: string): Promise<AccountSecretOut> {
  return apiV2Fetch<AccountSecretOut>(`/accounts/${id}/secret`, { auth: true });
}
