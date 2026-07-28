import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
} from "./tokenStore";
import type { RefreshResponse } from "./types";

// HiFIS-Server-V2 fetch 래퍼 — 모든 v2 도메인 호출은 이 곳을 거친다.
// backend-api.md §2·§3·§11 준수.

const BASE_URL =
  process.env.NEXT_PUBLIC_API_V2_BASE_URL ?? "http://localhost:8001";

// v2 도메인 에러 형태 (backend-api.md §2):
//   (A) HTTPException — detail: { code, message }
//   (B) 검증 실패 (422) — detail: [ { loc, msg, type }, ... ]
// 프론트는 code + message 조합으로 사용자에게 노출.
export class ApiV2Error extends Error {
  status: number;
  code: string;
  detail: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiV2Error";
    this.status = status;
    this.code = code;
    this.detail = message;
  }
}

export function getV2ErrorMessage(error: unknown): string {
  if (error instanceof ApiV2Error) {
    if (error.status === 429)
      return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    return error.detail;
  }
  return "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  // true 면 Authorization: Bearer <access> 첨부. 401 발생 시 refresh 후 1회 재시도.
  auth?: boolean;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const d = data?.detail;
    if (Array.isArray(d)) {
      // 검증 실패 — 첫 필드 메시지 노출
      throw new ApiV2Error(
        res.status,
        "VALIDATION_ERROR",
        d[0]?.msg ?? "입력을 확인해 주세요.",
      );
    }
    if (d && typeof d === "object") {
      throw new ApiV2Error(
        res.status,
        d.code ?? "ERROR",
        d.message ?? res.statusText,
      );
    }
    throw new ApiV2Error(
      res.status,
      "ERROR",
      typeof d === "string" ? d : res.statusText || "요청을 처리하지 못했습니다.",
    );
  }

  return data as T;
}

// 동시 401 이 여러 개 와도 refresh 는 한 번만.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccess(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as RefreshResponse;
        updateAccessToken(data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

// 부트스트랩용 — 앱 시작 시 memory access 가 비었으면 refresh 로 복원.
// 성공 시 true. 실패(refresh 없음/만료) 시 false — 호출측에서 로그인 화면 처리.
export function bootstrapAccessToken(): Promise<boolean> {
  if (getAccessToken()) return Promise.resolve(true);
  return refreshAccess();
}

export async function apiV2Fetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = false, headers, ...rest } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      ...(headers as Record<string, string> | undefined),
    };
    if (body !== undefined && !isFormData) h["Content-Type"] = "application/json";
    if (auth) {
      const token = getAccessToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  const serializedBody: BodyInit | undefined =
    body === undefined
      ? undefined
      : isFormData
        ? (body as FormData)
        : JSON.stringify(body);

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: buildHeaders(),
      body: serializedBody,
    });

  let res = await doFetch();

  // 401 INVALID_TOKEN → refresh 후 1회 재시도. 429 는 재시도 금지.
  if (res.status === 401 && auth) {
    const refreshed = await refreshAccess();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearSession();
    }
  }

  return parseResponse<T>(res);
}
