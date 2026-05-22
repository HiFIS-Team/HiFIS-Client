import { apiFetch } from "./client";
import type { PTApplication, PTApplicationCreate } from "./types";

// POST /pt-applications — PT 신청 (공개)
export function createPtApplication(
  payload: PTApplicationCreate,
): Promise<PTApplication> {
  return apiFetch<PTApplication>("/pt-applications", {
    method: "POST",
    body: payload,
  });
}
