// 회원권·수강권 이름에서 이용 기간을 추출 + 정렬용 일(day) 환산.
// 백엔드 Pass 스키마에 duration 필드가 없어서 이름으로 추정한다.
// register 폼(시작·종료일 자동 계산)과 admin 상품관리(정렬)에서 공용.

export type PassDuration = { months: number } | { days: number };

// "3개월권" → {months:3}, "1년권" → {months:12}, "7일권" → {days:7}.
// "일권" 만 있으면 1일로 본다. 추출 못 하면 null.
export function passDuration(name: string): PassDuration | null {
  const year = name.match(/(\d+)\s*년/);
  if (year) return { months: Number(year[1]) * 12 };
  const month = name.match(/(\d+)\s*개월/);
  if (month) return { months: Number(month[1]) };
  const day = name.match(/(\d+)\s*일/);
  if (day) return { days: Number(day[1]) };
  if (/일\s*권/.test(name)) return { days: 1 };
  return null;
}

// 정렬 비교용 — 일 단위 환산 (개월은 30일로 단순 환산. 정렬 순서만 정하면 되므로 충분).
// 기간 추출 못 한 패스는 Infinity 로 뒤로 보낸다.
export function passDurationDays(name: string): number {
  const d = passDuration(name);
  if (!d) return Number.POSITIVE_INFINITY;
  return "months" in d ? d.months * 30 : d.days;
}

// 카테고리(종류) 추출 — 이름에서 기간 키워드를 빼고 남은 토큰.
// 예: "1개월권" → 일반(빈), "학생 1개월권" → "학생", "제휴 1년권" → "제휴".
// 일반(빈) 은 sort=0 으로 항상 맨 앞, 나머지는 가나다 순.
export function passCategoryKey(name: string): { sort: number; label: string } {
  const cleaned = name
    .replace(/\d+\s*년/g, "")
    .replace(/\d+\s*개월/g, "")
    .replace(/\d+\s*일/g, "")
    .replace(/일\s*권/g, "")
    .replace(/권/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return { sort: 0, label: "" };
  return { sort: 1, label: cleaned };
}

// 회원권·수강권 표시 정렬 — 카테고리(일반·학생·제휴 등) → 기간 → 가격 → 이름.
// admin 상품관리와 register/수정 폼 Select 가 같은 순서로 보이도록 공용.
import type { Pass } from "./api/types";
export function sortPassesForUI(arr: Pass[]): Pass[] {
  return arr.slice().sort((a, b) => {
    const ca = passCategoryKey(a.name);
    const cb = passCategoryKey(b.name);
    if (ca.sort !== cb.sort) return ca.sort - cb.sort;
    if (ca.label !== cb.label) return ca.label.localeCompare(cb.label);
    const da = passDurationDays(a.name);
    const db = passDurationDays(b.name);
    if (da !== db) return da - db;
    if (a.cash_price !== b.cash_price) return a.cash_price - b.cash_price;
    return a.name.localeCompare(b.name);
  });
}
