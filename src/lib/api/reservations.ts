import { apiFetch } from "./client";
import type { Reservation, ReservationCreate } from "./types";

// POST /reservations — 예약 신청 (공개, 호출 제한 10/분)
export function createReservation(
  payload: ReservationCreate,
): Promise<Reservation> {
  return apiFetch<Reservation>("/reservations", {
    method: "POST",
    body: payload,
  });
}

// GET /admin/reservations — 예약 목록 조회 (관리자)
// branchId 지정 시 해당 지점만 (SUPER_ADMIN 필터용). FC는 토큰 기준 자동 분기.
export function getAdminReservations(
  branchId?: string,
): Promise<Reservation[]> {
  const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : "";
  return apiFetch<Reservation[]>(`/admin/reservations${query}`, { auth: true });
}

// DELETE /admin/reservations/{id} — 예약 삭제 (관리자)
export function deleteReservation(id: string): Promise<void> {
  return apiFetch<void>(`/admin/reservations/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
