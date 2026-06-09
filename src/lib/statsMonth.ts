// 통계·상품 판매 페이지의 월 셀렉터 공통 헬퍼.

// 이번 달 (yyyy-mm) — useState lazy init 용.
export function currentMonthYM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// 최근 N개월 옵션 — 이번 달부터 과거로 N-1개월. 이번 달엔 "(이번 달)" 표시.
export function buildMonthOptions(
  count: number,
): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = i === 0 ? `${y}년 ${m}월 (이번 달)` : `${y}년 ${m}월`;
    out.push({ value, label });
  }
  return out;
}
