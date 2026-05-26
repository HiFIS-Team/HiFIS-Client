import { apiFetch } from "./client";
import type { DashboardSummary } from "./types";

// GET /admin/dashboard/summary — 대시보드용 집계 응답.
// 4개 list 엔드포인트를 따로 호출하지 않고 한 번에 받는다 (회원 1000건 이상 운영 환경 대응).
// branchId 미지정 시 SUPER_ADMIN 전체, FC는 토큰 기준 자동 분기.
export function getDashboardSummary(
  branchId?: string,
): Promise<DashboardSummary> {
  const qs = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : "";
  return apiFetch<DashboardSummary>(`/admin/dashboard/summary${qs}`, {
    auth: true,
  });
}
