import { apiFetch } from "./client";
import type { Pass } from "./types";

// 지점별 상품 목록 — branch_id 필수 (공개)
function listPasses(path: string, branchId: string): Promise<Pass[]> {
  return apiFetch<Pass[]>(`${path}?branch_id=${encodeURIComponent(branchId)}`);
}

// GET /membership-passes — 회원권
export const getMembershipPasses = (branchId: string) =>
  listPasses("/membership-passes", branchId);

// GET /pt-passes — 수강권(PT)
export const getPtPasses = (branchId: string) =>
  listPasses("/pt-passes", branchId);

// GET /locker-passes — 락커
export const getLockerPasses = (branchId: string) =>
  listPasses("/locker-passes", branchId);

// GET /clothes-passes — 운동복
export const getClothesPasses = (branchId: string) =>
  listPasses("/clothes-passes", branchId);
