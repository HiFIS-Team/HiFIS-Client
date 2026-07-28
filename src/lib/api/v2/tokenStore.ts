// v2 토큰 저장 — HiFIS-Server-V2 권장 방식 (backend-api.md §3):
//   accessToken : "메모리 권장" → 모듈 스코프 변수. XSS 노출 최소화.
//   refreshToken: "안전한 저장소" → 새로고침/재접속 유지를 위해 storage.
//                 remember=true → localStorage(영구) / false → sessionStorage(탭 세션).
//
// 페이지 하드 리프레시 시 accessToken 은 사라짐 → refresh 로 재발급 필요.
// (login 페이지 진입 effect 에서 부트스트랩)

const REFRESH_KEY = "hifis_v2_refresh_token";

// 메모리 access — 창 다시 열면 없어진다. Refresh 로 복원.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function refreshStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  if (window.sessionStorage.getItem(REFRESH_KEY)) return window.sessionStorage;
  if (window.localStorage.getItem(REFRESH_KEY)) return window.localStorage;
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem(REFRESH_KEY) ??
    window.localStorage.getItem(REFRESH_KEY)
  );
}

// 로그인 성공 직후. remember 에 따라 refresh 저장소 결정.
// 반대편 storage 잔존 refresh 는 정리.
export function setSession(
  access: string,
  refresh: string,
  remember: boolean,
): void {
  accessToken = access;
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(REFRESH_KEY, refresh);
}

// refresh 성공 후 새 access 만 메모리 갱신 (v2 refresh 응답엔 새 refreshToken 없음).
export function updateAccessToken(access: string): void {
  accessToken = access;
}

export function clearSession(): void {
  accessToken = null;
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
