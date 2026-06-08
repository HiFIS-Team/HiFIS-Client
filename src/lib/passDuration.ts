// 회원권·수강권 이용 기간 추출 — 백엔드 컬럼 우선(`duration_months` → `_days` → `_hours`),
// 없으면 이름에서 정규식 fallback. 정렬·자동 일자 계산·그룹화에 공용.

export type PassDuration =
  | { months: number }
  | { days: number }
  | { hours: number };

// passDuration 헬퍼가 읽는 컬럼들 — Pass 또는 PassInput 모두 호환.
export interface PassDurationSource {
  name: string;
  duration_months?: number | null;
  duration_days?: number | null;
  duration_hours?: number | null;
}

// 이름에서 기간 토큰을 잡는다 — "3개월권" → {months:3}, "1년권" → {months:12},
// "2주권" → {days:14}, "7일권" → {days:7}, "일권" → {days:1},
// "3시간권" → {hours:3}.
function durationFromName(name: string): PassDuration | null {
  const year = name.match(/(\d+)\s*년/);
  if (year) return { months: Number(year[1]) * 12 };
  const month = name.match(/(\d+)\s*개월/);
  if (month) return { months: Number(month[1]) };
  const week = name.match(/(\d+)\s*주/);
  if (week) return { days: Number(week[1]) * 7 };
  const day = name.match(/(\d+)\s*일/);
  if (day) return { days: Number(day[1]) };
  const hour = name.match(/(\d+)\s*시간/);
  if (hour) return { hours: Number(hour[1]) };
  if (/일\s*권/.test(name)) return { days: 1 };
  return null;
}

// 백엔드 duration_* 컬럼이 채워져 있으면 그 값을 사용, 아니면 이름에서 추출.
// 한 상품엔 (months, days, hours) 중 하나만 채워져 있다는 백엔드 검증을 신뢰.
export function passDuration(p: PassDurationSource): PassDuration | null {
  if (p.duration_months != null && p.duration_months > 0)
    return { months: p.duration_months };
  if (p.duration_days != null && p.duration_days > 0)
    return { days: p.duration_days };
  if (p.duration_hours != null && p.duration_hours > 0)
    return { hours: p.duration_hours };
  return durationFromName(p.name);
}

// PT 수강권 이용 기간(일). 우선순위:
//   1) duration_days  — 일 단위 직접 입력 (PT 기본)
//   2) duration_months — 개월 입력 시 ×30 (드문 케이스)
//   3) duration_hours — 시간권 → 당일(1일)
//   4) 이름에서 회수(N회) 추출 → N × 4 (10회당 40일 정책)
//   5) 다 실패하면 40일 fallback
export const PT_DAYS_PER_SESSION = 4;
export const PT_DAYS_FALLBACK = 40;
export function ptDurationDays(p: PassDurationSource): number {
  if (p.duration_days != null && p.duration_days > 0) return p.duration_days;
  if (p.duration_months != null && p.duration_months > 0)
    return p.duration_months * 30;
  if (p.duration_hours != null && p.duration_hours > 0) return 1; // 당일
  const m = p.name.match(/(\d+)\s*회/);
  return m ? Number(m[1]) * PT_DAYS_PER_SESSION : PT_DAYS_FALLBACK;
}

// 정렬 비교용 — 일 단위 환산. 개월은 30일, 시간은 N/24 로 환산.
// 시간 토큰이 없는 수강권("N회") 은 회수를 정렬 키로 사용 — 실제 일수 아님,
// 어차피 같은 카테고리("1:1 PT" 등) 안에서만 비교되므로 단위 혼동 없음.
export function passDurationDays(p: PassDurationSource): number {
  const d = passDuration(p);
  if (d) {
    if ("months" in d) return d.months * 30;
    if ("days" in d) return d.days;
    return d.hours / 24;
  }
  const sessions = p.name.match(/(\d+)\s*회/);
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
    .replace(/\d+\s*시간/g, "")
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
    const da = passDurationDays(a);
    const db = passDurationDays(b);
    if (da !== db) return da - db;
    if (a.cash_price !== b.cash_price) return a.cash_price - b.cash_price;
    return a.name.localeCompare(b.name);
  });
}
