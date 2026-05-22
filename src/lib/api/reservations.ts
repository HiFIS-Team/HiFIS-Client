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
