import { apiFetch } from "./client";

// POST /admin/holds 요청 — source_type 은 MEMBER | PT_APPLICATION
export interface HoldCreate {
  source_type: string;
  source_id: string;
  reason: string;
  start_date: string;
  end_date: string;
}

export interface Hold {
  id: string;
  source_type: string;
  source_id: string;
  reason: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

// POST /admin/holds — 홀딩 신청 (관리자, FC는 자기 지점만)
export function createHold(payload: HoldCreate): Promise<Hold> {
  return apiFetch<Hold>("/admin/holds", {
    method: "POST",
    body: payload,
    auth: true,
  });
}
