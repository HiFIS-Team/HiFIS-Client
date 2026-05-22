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

// GET /admin/reservations — 예약 목록 조회 (관리자, FC는 자기 지점만)
export function getAdminReservations(): Promise<Reservation[]> {
  return apiFetch<Reservation[]>("/admin/reservations", { auth: true });
}

// DELETE /admin/reservations/{id} — 예약 삭제 (관리자)
export function deleteReservation(id: string): Promise<void> {
  return apiFetch<void>(`/admin/reservations/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
