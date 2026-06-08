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

// --- 관리자 상품 관리 (4종 동일 구조) ---

export type PassType = "membership" | "pt" | "locker" | "clothes";

const ADMIN_PASS_PATH: Record<PassType, string> = {
  membership: "/admin/membership-passes",
  pt: "/admin/pt-passes",
  locker: "/admin/locker-passes",
  clothes: "/admin/clothes-passes",
};

export interface PassInput {
  name: string;
  cash_price: number;
  card_price: number;
  // 이용 기간 — 셋 중 최대 하나만 number, 나머지는 null. 셋 다 null 이면 이름에서 추출.
  // 백엔드 cross-field 검증: 둘 이상 채우면 400.
  duration_months?: number | null;
  duration_days?: number | null;
  duration_hours?: number | null;
  // 회원권·수강권에만 사용 — 락커·운동복 등록·수정 시엔 payload 에 포함하지 말 것.
  provides_locker?: boolean;
  provides_clothes?: boolean;
}

// GET /admin/{type}-passes?branch_id= — 지점별 상품 목록 (관리자)
export function getAdminPasses(
  type: PassType,
  branchId: string,
): Promise<Pass[]> {
  return apiFetch<Pass[]>(
    `${ADMIN_PASS_PATH[type]}?branch_id=${encodeURIComponent(branchId)}`,
    { auth: true },
  );
}

// POST /admin/{type}-passes — 상품 등록 (관리자)
export function createPass(
  type: PassType,
  payload: PassInput & { branch_id: string },
): Promise<Pass> {
  return apiFetch<Pass>(ADMIN_PASS_PATH[type], {
    method: "POST",
    body: payload,
    auth: true,
  });
}

// PATCH /admin/{type}-passes/{id} — 상품 수정 (관리자)
export function updatePass(
  type: PassType,
  id: string,
  payload: PassInput,
): Promise<Pass> {
  return apiFetch<Pass>(`${ADMIN_PASS_PATH[type]}/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

// DELETE /admin/{type}-passes/{id} — 상품 삭제 (관리자, 사용 중이면 409)
export function deletePass(type: PassType, id: string): Promise<void> {
  return apiFetch<void>(`${ADMIN_PASS_PATH[type]}/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
