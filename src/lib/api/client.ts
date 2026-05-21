import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStore";

// 모든 백엔드(FastAPI) 호출의 단일 진입점.
// claude.md: 컴포넌트가 직접 fetch 하지 말고 이 래퍼를 거친다.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// 백엔드 에러 — HTTP status + { detail: "한국어 메시지" }.
// detail은 사용자에게 그대로 보여줘도 되는 한국어 메시지.
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  // JSON 본문 — 객체를 넘기면 자동 직렬화된다
  body?: unknown;
  // true면 Authorization 헤더에 access token 첨부 (관리자 API)
  auth?: boolean;
}

// 응답 파싱 — 204/빈 본문 처리, 실패는 ApiError로 변환
async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail =
      data && typeof data.detail === "string"
        ? data.detail
        : "요청을 처리하지 못했습니다.";
    throw new ApiError(res.status, detail);
  }

  return data as T;
}

// access token 만료(401) 시 refresh로 재발급.
// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 수행.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // TODO: 요청/응답 스키마는 백엔드(HiFIS-Server)에서 확인
        const res = await fetch(`${BASE_URL}/admin/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setTokens(data.access_token, data.refresh_token ?? refreshToken);
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

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = false, headers, ...rest } = options;

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      ...(headers as Record<string, string> | undefined),
    };
    if (body !== undefined) h["Content-Type"] = "application/json";
    if (auth) {
      const token = getAccessToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  // 관리자 API에서 access 만료(401) → refresh 후 1회만 재시도.
  // 429(호출 제한)는 자동 재시도하지 않는다 (claude.md Rate Limiting).
  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      // refresh 실패 → 토큰 폐기. 호출 측에서 로그인 화면으로 보낸다.
      clearTokens();
    }
  }

  return parseResponse<T>(res);
}
