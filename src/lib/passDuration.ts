// 회원권·수강권 이용 기간 추출 — 백엔드 `duration_months` 컬럼 우선,
// 없으면(예: 일권·2주권) 이름에서 정규식 fallback. 정렬·자동 일자 계산·그룹화에 공용.

export type PassDuration = { months: number } | { days: number };

// 이름에서 기간 토큰을 잡는다 — "3개월권" → {months:3}, "1년권" → {months:12},
// "2주권" → {days:14}, "7일권" → {days:7}, "일권" → {days:1}.
function durationFromName(name: string): PassDuration | null {
  const year = name.match(/(\d+)\s*년/);
  if (year) return { months: Number(year[1]) * 12 };
  const month = name.match(/(\d+)\s*개월/);
  if (month) return { months: Number(month[1]) };
  const week = name.match(/(\d+)\s*주/);
  if (week) return { days: Number(week[1]) * 7 };
  const day = name.match(/(\d+)\s*일/);
  if (day) return { days: Number(day[1]) };
  if (/일\s*권/.test(name)) return { days: 1 };
  return null;
}

// 백엔드 duration_months 가 있으면 그걸 사용, 없으면 이름에서 추출.
// 호출처는 가능하면 Pass 객체를 전달 — 정확도 높아짐.
export function passDuration(
  name: string,
  durationMonths?: number | null,
): PassDuration | null {
  if (durationMonths != null && durationMonths > 0) {
    return { months: durationMonths };
  }
  return durationFromName(name);
}

// PT 수강권 이용 기간(일). 우선순위:
//   1) duration_months 컬럼이 채워져 있으면 그 값을 "일" 로 사용
//      (PT 한정으로 컬럼을 일 단위 저장소로 재사용 — 백엔드 schema 그대로)
//   2) 비어있으면 이름에서 회수(N회) 추출 → N × 4 (10회당 40일 정책)
//   3) 회수도 못 찾으면 40일 fallback
export const PT_DAYS_PER_SESSION = 4;
export const PT_DAYS_FALLBACK = 40;
export function ptDurationDays(
  passName: string,
  durationMonths?: number | null,
): number {
  if (durationMonths != null && durationMonths > 0) return durationMonths;
  const m = passName.match(/(\d+)\s*회/);
  return m ? Number(m[1]) * PT_DAYS_PER_SESSION : PT_DAYS_FALLBACK;
}

// 정렬 비교용 — 일 단위 환산. 개월은 30일로 단순 환산.
// 시간 토큰이 없는 수강권("N회") 은 회수를 정렬 키로 사용 — 실제 일수 아님,
// 어차피 같은 카테고리("1:1 PT" 등) 안에서만 비교되므로 단위 혼동 없음.
export function passDurationDays(
  name: string,
  durationMonths?: number | null,
): number {
  const d = passDuration(name, durationMonths);
  if (d) return "months" in d ? d.months * 30 : d.days;
  const sessions = name.match(/(\d+)\s*회/);
  if (sessions) return Number(sessions[1]);
  return Number.POSITIVE_INFINITY;
}

// 카테고리(종류) 추출 — 이름에서 기간/회수 키워드를 빼고 남은 토큰.
// 예: "1개월권" → 일반(빈), "학생 1개월권" → "학생", "제휴 1년권" → "제휴",
//     "1:1 PT 10회" → "1:1 PT", "2:1 PT 5회" → "2:1 PT".
// 일반(빈) 은 sort=0 으로 항상 맨 앞, 나머지는 가나다 순.
export function passCategoryKey(name: string): { sort: number; label: string } {
  const cleaned = name
    .replace(/\d+\s*년/g, "")
    .replace(/\d+\s*개월/g, "")
    .replace(/\d+\s*주/g, "")
    .replace(/\d+\s*일/g, "")
    .replace(/\d+\s*회/g, "")
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
    const da = passDurationDays(a.name, a.duration_months);
    const db = passDurationDays(b.name, b.duration_months);
    if (da !== db) return da - db;
    if (a.cash_price !== b.cash_price) return a.cash_price - b.cash_price;
    return a.name.localeCompare(b.name);
  });
}
