// 관리자 토큰 저장 — 자동 로그인 체크 여부로 storage 선택.
// - 자동 로그인 체크 : localStorage  (브라우저·탭 닫아도 유지)
// - 미체크          : sessionStorage (탭 닫으면 사라짐 → 재로그인 필요)
// 두 storage 모두 폴백 조회. refresh 시에는 현재 토큰이 있는 storage 그대로 갱신.
// 관리자 대시보드 전용 — 키오스크·예약 화면은 인증이 없다.

const ACCESS_KEY = "hifis_access_token";
const REFRESH_KEY = "hifis_refresh_token";

// 현재 토큰이 들어있는 storage 찾기 (없으면 null).
// session 우선 — 자동 로그인 모드 전환 직후에도 새로 저장된 쪽을 본다.
function activeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  if (window.sessionStorage.getItem(REFRESH_KEY)) return window.sessionStorage;
  if (window.localStorage.getItem(REFRESH_KEY)) return window.localStorage;
  return null;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem(ACCESS_KEY) ??
    window.localStorage.getItem(ACCESS_KEY)
  );
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem(REFRESH_KEY) ??
    window.localStorage.getItem(REFRESH_KEY)
  );
}

// 로그인 직후 호출 — remember 에 따라 storage 결정.
// 모드 전환 대비해 반대편 storage 의 잔존 토큰도 정리한다.
export function setTokens(
  accessToken: string,
  refreshToken: string,
  remember: boolean,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACCESS_KEY);
  window.sessionStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);

  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(ACCESS_KEY, accessToken);
  storage.setItem(REFRESH_KEY, refreshToken);
}

// refresh 후 새 토큰으로 갱신 — 현재 storage 유지.
// (자동 로그인 체크/미체크 상태가 재로그인 없이도 유지됨)
export function updateTokens(
  accessToken: string,
  refreshToken: string,
): void {
  const storage = activeStorage();
  if (!storage) return;
  storage.setItem(ACCESS_KEY, accessToken);
  storage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACCESS_KEY);
  window.sessionStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
