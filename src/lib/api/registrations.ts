import { apiFetch } from "./client";
import type { RegistrationLookupResponse } from "./types";

// GET /registrations/lookup — 재등록 사전 조회 (공개).
// branch+name+phone 으로 기존 회원/PT 정보 미리 받아 폼 prefill 에 사용.
// kinds 가 빈 배열이면 일치하는 정보가 없는 것 (회원·PT 둘 다 가능).
export function getRegistrationLookup(params: {
  branchId: string;
  name: string;
  phone: string;
}): Promise<RegistrationLookupResponse> {
  const qs = new URLSearchParams({
    branch_id: params.branchId,
    name: params.name,
    phone: params.phone,
  }).toString();
  return apiFetch<RegistrationLookupResponse>(`/registrations/lookup?${qs}`);
}
