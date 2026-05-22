import { apiFetch } from "./client";
import type { Member, MemberCreate } from "./types";

// POST /members — 회원가입 신청 (공개)
export function createMember(payload: MemberCreate): Promise<Member> {
  return apiFetch<Member>("/members", { method: "POST", body: payload });
}
