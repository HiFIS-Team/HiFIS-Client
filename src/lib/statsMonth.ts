// 통계·상품 판매 페이지의 월 셀렉터 공통 헬퍼.

// 앱(통계 기능) 최초 운영 시점 — 그 이전 달은 데이터가 없어 옵션에 안 노출.
// 새 버전이 운영된 첫 달.
const APP_EPOCH = { year: 2026, month: 6 };

// 이번 달 (yyyy-mm) — useState lazy init 용.
export function currentMonthYM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// 최근 N개월 옵션 — 이번 달부터 과거로 N-1개월. APP_EPOCH 이전은 제외.
// 이번 달엔 "(이번 달)" 표시. 자정 지나면 페이지 재진입 시 자동 갱신.
export function buildMonthOptions(
  count: number,
): { value: string; label: string }[] {
  const now = new Date();
  const epoch = new Date(APP_EPOCH.year, APP_EPOCH.month - 1, 1);
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (d < epoch) break;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = i === 0 ? `${y}년 ${m}월 (이번 달)` : `${y}년 ${m}월`;
    out.push({ value, label });
  }
  return out;
}

// 향후 N개월 옵션 — 이번 달부터 미래로 N-1개월. 이번 달엔 "(이번 달)" 표시.
// 잔여 기간 페이지처럼 미래 시점 시뮬레이션용 셀렉터에 사용.
export function buildFutureMonthOptions(
  count: number,
): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = i === 0 ? `${y}년 ${m}월 (이번 달)` : `${y}년 ${m}월`;
    out.push({ value, label });
  }
  return out;
}
