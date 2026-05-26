import { apiFetch } from "./client";
import type { EnumOption, Message } from "./types";

// GET /admin/messages — 알림톡 발송 이력 (관리자, FC는 자기 지점만, 최신순)
// branchId 전달 시 해당 지점만 (SUPER_ADMIN 지점 필터용).
// phone 은 수신자 전화번호 부분일치 검색 (백엔드가 숫자만 추출해 비교).
export function getAdminMessages(
  branchId?: string,
  phone?: string,
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (branchId) params.set("branch_id", branchId);
  if (phone) params.set("phone", phone);
  const qs = params.toString();
  return apiFetch<Message[]>(`/admin/messages${qs ? `?${qs}` : ""}`, {
    auth: true,
  });
}

// enum 옵션 배열에서 code → label 조회. 없으면 code 그대로 반환 (안전 폴백).
// 알림톡 trigger_type·source_type 같은 enum 라벨을 변환할 때 사용.
export function enumLabel(
  options: EnumOption[] | undefined,
  code: string,
): string {
  return options?.find((o) => o.code === code)?.label ?? code;
}
