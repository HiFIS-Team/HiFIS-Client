import { apiFetch } from "./client";
import type { Message } from "./types";

// GET /admin/messages — 알림톡 발송 이력 (관리자, FC는 자기 지점만, 최신순)
export function getAdminMessages(): Promise<Message[]> {
  return apiFetch<Message[]>("/admin/messages", { auth: true });
}

// 발송 종류(trigger_type) 한국어 라벨.
// 백엔드가 이 enum 라벨을 제공하지 않아 프론트에서 매핑한다.
// (백엔드 GET /enums 에 추가되면 그쪽으로 옮길 것)
export const TRIGGER_LABELS: Record<string, string> = {
  RESERVATION_CONFIRM: "예약 확인",
  REGISTERED: "신청 접수",
  HOLD: "홀딩 신청",
  HOLD_CANCEL: "홀딩 취소",
  RESERVATION_CHECK_1: "예약 확인 1차",
  RESERVATION_CHECK_2: "예약 확인 2차",
  D_PLUS_7: "가입 7일차",
  D_PLUS_14: "가입 14일차",
  D_PLUS_30: "가입 30일차",
  EXPIRY_SOON_5: "만기 5일 전",
  EXPIRY_SOON_2: "만기 2일 전",
  EXPIRED_TODAY: "만기 당일",
  EXPIRED_FOLLOWUP: "만기 후 안내",
};

// 알림톡 발생 출처(source_type) 한국어 라벨
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  MEMBER: "회원",
  PT_APPLICATION: "PT 신청",
  RESERVATION: "예약",
  HOLD: "홀딩",
};
