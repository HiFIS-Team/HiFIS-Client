import { apiFetch } from "./client";

// GET /admin/stats/* 응답
export interface StatItem {
  code: string;
  label: string;
  count: number;
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
