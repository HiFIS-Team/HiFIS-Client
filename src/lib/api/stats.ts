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

function statsPath(path: string, branchId?: string): string {
  return branchId ? `${path}?branch_id=${encodeURIComponent(branchId)}` : path;
}

// GET /admin/stats/referral — 이번 달 유입경로 통계 (회원+PT 합산)
export function getReferralStats(branchId?: string): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(statsPath("/admin/stats/referral", branchId), {
    auth: true,
  });
}

// GET /admin/stats/motivation — 이번 달 방문목적 통계 (회원 기준)
export function getMotivationStats(branchId?: string): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(
    statsPath("/admin/stats/motivation", branchId),
    { auth: true },
  );
}
