import { apiFetch } from "./client";

// GET /admin/stats/* 응답
export interface StatItem {
  code: string;
  label: string;
  count: number;
  // 상품별 판매(passes) 의 회원권/PT 항목에서만 채워짐.
  // price : 그 상품 정가 (cash_price) — 라벨 옆 괄호에 그대로 표시.
  // revenue : 실제 결제 매출 합산 (final_price 합) — 막대 클릭 시 펼쳐 표시.
  // 락커/운동복은 둘 다 미존재. 다른 통계(referral/motivation 등) 도 미존재.
  price?: number;
  revenue?: number;
}
// 자유 텍스트 통계 항목 (referral 의 기타 세부 입력) — code 없음
export interface StatDetailItem {
  label: string;
  count: number;
}
export interface StatsResponse {
  items: StatItem[];
  total: number;
  // referral 통계에서만 채워짐 (회원·PT 합산 자유 입력 카운트). motivation 등은 빈 배열.
  details: StatDetailItem[];
}

// month: "YYYY-MM" 형식. 미지정 시 백엔드가 이번 달 기준으로 집계.
function statsPath(path: string, branchId?: string, month?: string): string {
  const params = new URLSearchParams();
  if (branchId) params.set("branch_id", branchId);
  if (month) params.set("month", month);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

// GET /admin/stats/referral — 유입경로 통계 (회원+PT 합산). month 지정 시 그 달, 미지정 시 이번 달.
export function getReferralStats(
  branchId?: string,
  month?: string,
): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(
    statsPath("/admin/stats/referral", branchId, month),
    { auth: true },
  );
}

// GET /admin/stats/motivation — 방문목적 통계 (회원 기준). month 지정 시 그 달, 미지정 시 이번 달.
export function getMotivationStats(
  branchId?: string,
  month?: string,
): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(
    statsPath("/admin/stats/motivation", branchId, month),
    { auth: true },
  );
}

// 회원권 잔여 기간 분포 — 오늘 시점 스냅샷.
// items 모양은 기존 StatItem 과 동일 (StatChart 재사용).
export interface MembershipExpiryResponse {
  items: StatItem[];
  total: number;
}

// GET /admin/stats/membership-expiry — 유효 회원의 잔여 기간 구간별 카운트.
export function getMembershipExpiryStats(
  branchId?: string,
): Promise<MembershipExpiryResponse> {
  return apiFetch<MembershipExpiryResponse>(
    statsPath("/admin/stats/membership-expiry", branchId),
    { auth: true },
  );
}

// 신규(NEW) vs 재등록(EXISTING) 비율 — 회원·수강권 묶음.
// items 의 code/label 모양은 기존 StatItem 과 동일.
export interface CategoryStatsResponse {
  member: { items: StatItem[]; total: number };
  pt: { items: StatItem[]; total: number };
}

// GET /admin/stats/category — 회원·PT 신규/재등록 월 카운트.
export function getCategoryStats(
  branchId?: string,
  month?: string,
): Promise<CategoryStatsResponse> {
  return apiFetch<CategoryStatsResponse>(
    statsPath("/admin/stats/category", branchId, month),
    { auth: true },
  );
}

// 상품별 판매 통계 — 4종(회원권/PT/락커/운동복) 묶음.
// 각 종의 items[i].code = pass_id, label = pass_name. 기존 StatChart 재사용.
export interface PassSalesResponse {
  membership: { items: StatItem[]; total: number };
  pt: { items: StatItem[]; total: number };
  locker: { items: StatItem[]; total: number };
  clothes: { items: StatItem[]; total: number };
}

// GET /admin/stats/passes — 상품별 월 판매 건수.
export function getPassSalesStats(
  branchId?: string,
  month?: string,
): Promise<PassSalesResponse> {
  return apiFetch<PassSalesResponse>(
    statsPath("/admin/stats/passes", branchId, month),
    { auth: true },
  );
}
