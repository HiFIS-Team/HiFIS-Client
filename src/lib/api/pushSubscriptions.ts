import { apiFetch } from "./client";

// Web Push 구독 — 백엔드 등록·해제·VAPID 공개키 조회.
// 진짜 푸시 흐름:
// 1) 프론트가 GET vapid-public-key → 받은 키로 PushManager.subscribe
// 2) 결과 {endpoint, p256dh, auth} 를 POST push-subscriptions 로 백엔드 등록
// 3) 알림 생성 시 백엔드가 그 구독지로 푸시 전송 → 서비스워커 push 이벤트
// 4) 구독 해제 시 DELETE push-subscriptions/{id}

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}

export interface PushSubscriptionResponse {
  id: string;
  endpoint: string;
  created_at: string;
}

// GET /admin/push/vapid-public-key — 인증 불필요 (백엔드 정의에 따라)
// 비어있으면 백엔드가 Web Push 설정 안 한 상태 → 프론트에서 구독 시도 자체를 건너뛴다.
export function getVapidPublicKey(): Promise<{ public_key: string }> {
  return apiFetch<{ public_key: string }>("/admin/push/vapid-public-key");
}

// POST /admin/push-subscriptions — 구독 등록 (idempotent, 신규 201 / 갱신 200)
export function registerPushSubscription(
  payload: PushSubscriptionPayload,
): Promise<PushSubscriptionResponse> {
  return apiFetch<PushSubscriptionResponse>("/admin/push-subscriptions", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

// DELETE /admin/push-subscriptions/{id} — 본인 구독만 해제
export function deletePushSubscription(id: string): Promise<void> {
  return apiFetch<void>(`/admin/push-subscriptions/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
