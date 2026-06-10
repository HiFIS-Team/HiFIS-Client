import { apiFetch } from "./client";
import type { EnumOption, Message, Page } from "./types";

// GET /admin/messages — 알림톡 발송 이력 (관리자, 페이지네이션, 최신순)
// 응답은 Page<Message> envelope. 카운트는 /admin/dashboard/summary 사용.
// phone 은 수신자 전화번호 부분일치 검색 (백엔드가 숫자만 추출해 비교).
export function getAdminMessages(opts: {
  branchId?: string;
  phone?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Page<Message>> {
  const params = new URLSearchParams();
  if (opts.branchId) params.set("branch_id", opts.branchId);
  if (opts.phone) params.set("phone", opts.phone);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<Page<Message>>(`/admin/messages${qs ? `?${qs}` : ""}`, {
    auth: true,
  });
}

// DELETE /admin/messages/{id} — 알림톡 발송 이력 한 건 삭제 (이력 레코드만; 실제 발송 내용 무관).
export function deleteMessage(id: string): Promise<void> {
  return apiFetch<void>(`/admin/messages/${encodeURIComponent(id)}`, {
    method: "DELETE",
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
