import { apiFetch } from "./client";
import type { Page, Reservation, ReservationCreate } from "./types";

// POST /reservations — 예약 신청 (공개, 호출 제한 10/분)
export function createReservation(
  payload: ReservationCreate,
): Promise<Reservation> {
  return apiFetch<Reservation>("/reservations", {
    method: "POST",
    body: payload,
  });
}

// GET /admin/reservations — 예약 목록 (관리자, 페이지네이션)
// 응답은 Page<Reservation> envelope. 카운트·집계는 /admin/dashboard/summary 사용.
export function getAdminReservations(opts: {
  branchId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Page<Reservation>> {
  const params = new URLSearchParams();
  if (opts.branchId) params.set("branch_id", opts.branchId);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<Page<Reservation>>(
    `/admin/reservations${qs ? `?${qs}` : ""}`,
    { auth: true },
  );
}

// DELETE /admin/reservations/{id} — 예약 삭제 (관리자)
export function deleteReservation(id: string): Promise<void> {
  return apiFetch<void>(`/admin/reservations/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
