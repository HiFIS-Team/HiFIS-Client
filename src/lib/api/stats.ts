import { apiFetch } from "./client";

// GET /admin/stats/* 응답
export interface StatItem {
  code: string;
  label: string;
  count: number;
}
export interface StatsResponse {
  items: StatItem[];
  total: number;
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
