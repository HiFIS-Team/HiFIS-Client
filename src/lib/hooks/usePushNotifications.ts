"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePushSubscription,
  getVapidPublicKey,
  registerPushSubscription,
} from "@/lib/api/pushSubscriptions";

// Web Push 구독 상태·제어 hook.
// 관리자가 "푸시 알림 켜기" 토글 클릭 시 → 권한 요청 → 구독 → 백엔드 등록까지 일괄.
//
// 동작 조건:
// - 브라우저가 Notification + ServiceWorker + PushManager 지원
// - HTTPS (localhost 는 예외)
// - 백엔드가 VAPID 공개키 제공 (없으면 supported=false 처럼 동작)
//
// dev / VAPID 미설정 환경에선 enable() 호출 시 에러로 끝남 → caller 에서 toast 처리.

const SUBSCRIPTION_ID_KEY = "hifis_push_subscription_id";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface PushNotificationsState {
  supported: boolean;
  permission: PushPermission;
  subscribed: boolean;
  isBusy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

// VAPID 공개키(base64url) → Uint8Array (PushManager.subscribe 요구 형식)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ArrayBuffer → base64 (백엔드가 받는 p256dh/auth 형식)
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function isSupportedEnv(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function usePushNotifications(): PushNotificationsState {
  // lazy init — window/navigator 접근은 마운트 시 1회 (React 19: effect 안 setState 회피)
  const [supported] = useState<boolean>(() => isSupportedEnv());
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission as PushPermission;
  });
  const [subscribed, setSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // 기존 구독 여부 — async 라 effect 에서 외부 시스템(SW) 와 동기화.
  // 추가로 "브라우저엔 구독 있는데 백엔드엔 없음" 케이스 대비:
  //   도메인 cutover, endpoint 만료 자동 정리, PWA 재설치 등으로 발생.
  //   idempotent POST 로 자동 재등록 (백엔드가 같은 endpoint 면 갱신만).
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setSubscribed(!!sub);
        if (sub) {
          try {
            const { id } = await registerPushSubscription({
              endpoint: sub.endpoint,
              p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
              auth: arrayBufferToBase64(sub.getKey("auth")),
              user_agent:
                typeof navigator !== "undefined" ? navigator.userAgent : null,
            });
            localStorage.setItem(SUBSCRIPTION_ID_KEY, id);
          } catch {
            // 로그인 전 (401) 또는 일시 오류 — 다음 마운트에 재시도
          }
        }
      } catch {
        // 서비스워커가 아직 등록 안 됐을 수 있음 — 정상 (subscribed false)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!isSupportedEnv()) throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
    setIsBusy(true);
    try {
      // 권한 요청 (이미 granted 면 즉시 통과)
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") {
        throw new Error("푸시 알림 권한이 허용되지 않았습니다.");
      }
      // 백엔드 VAPID 공개키
      const { public_key } = await getVapidPublicKey();
      if (!public_key) {
        throw new Error("백엔드에 푸시 설정이 안 되어 있습니다.");
      }
      const reg = await navigator.serviceWorker.ready;
      // 이미 구독 있으면 재사용, 없으면 신규
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // TS DOM lib 가 Uint8Array<ArrayBufferLike> 를 BufferSource 로 좁히지 못해 캐스팅
          applicationServerKey: urlBase64ToUint8Array(
            public_key,
          ) as unknown as BufferSource,
        });
      }
      // 백엔드에 등록 (idempotent — 같은 endpoint 면 갱신)
      const { id } = await registerPushSubscription({
        endpoint: sub.endpoint,
        p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
        auth: arrayBufferToBase64(sub.getKey("auth")),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      localStorage.setItem(SUBSCRIPTION_ID_KEY, id);
      setSubscribed(true);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    if (!isSupportedEnv()) return;
    setIsBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      // 백엔드 등록 해제 (subscription_id 가 localStorage 에 저장돼 있으면)
      const id = localStorage.getItem(SUBSCRIPTION_ID_KEY);
      if (id) {
        // 실패해도 무시 — 백엔드 측 만료된 구독은 자동 정리됨
        try {
          await deletePushSubscription(id);
        } catch {
          /* noop */
        }
        localStorage.removeItem(SUBSCRIPTION_ID_KEY);
      }
      // 브라우저 측 구독 해제
      if (sub) await sub.unsubscribe();
      setSubscribed(false);
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { supported, permission, subscribed, isBusy, enable, disable };
}
