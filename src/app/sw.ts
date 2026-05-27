import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// 서비스워커 진입점 — Serwist가 이 파일을 public/sw.js로 컴파일한다.
// next.config.ts 의 swSrc 가 이 경로를 가리킴.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // 빌드 시 프리캐시 목록이 주입되는 지점
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// --- Web Push ---
// 백엔드가 보낸 푸시 페이로드 형태:
//   { title: string, body: string, source_type?: string, source_id?: string }
// title/body 는 알림에 그대로, source_type 으로 클릭 시 이동 경로 결정.
interface PushPayload {
  title: string;
  body: string;
  source_type?: string;
  source_id?: string;
}

// source_type → 어드민 경로 (notifications.ts 의 notificationLink 와 동일 매핑)
function pathForSource(sourceType?: string): string {
  switch (sourceType) {
    case "RESERVATION":
      return "/admin/reservations";
    case "MEMBER":
      return "/admin/members";
    case "PT_APPLICATION":
      return "/admin/pt-applications";
    case "FC_SIGNUP":
      return "/admin/admins";
    default:
      return "/admin";
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    // 비-JSON 페이로드는 무시 (예방적)
    return;
  }
  const url = pathForSource(payload.source_type);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
      tag: payload.source_type, // 같은 종류는 마지막 것으로 갱신
    }),
  );
});

// 알림 클릭 — 해당 어드민 페이지로 이동.
// 이미 같은 도메인 탭이 열려있으면 그 탭에 focus + 라우팅, 없으면 새 탭.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? "/admin";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // 어드민 탭 우선 (있으면 focus 후 url 로 navigate)
      const adminClient = all.find((c) => c.url.includes("/admin"));
      if (adminClient && "navigate" in adminClient) {
        await adminClient.focus();
        await (adminClient as WindowClient).navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
