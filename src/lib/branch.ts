// 키오스크 지점 설정 — 태블릿은 지점이 고정이므로 최초 1회 선택해
// localStorage 에 저장하고, 이후 접속 시 자동으로 사용한다.

const BRANCH_KEY = "hifis_kiosk_branch_id";

export function getKioskBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BRANCH_KEY);
}

export function setKioskBranchId(branchId: string): void {
  window.localStorage.setItem(BRANCH_KEY, branchId);
}

export function clearKioskBranchId(): void {
  window.localStorage.removeItem(BRANCH_KEY);
}
