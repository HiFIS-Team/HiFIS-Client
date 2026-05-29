"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 푸시 알림 클릭 → SW 가 postMessage 로 url 을 보내면 router.push 로 SPA 라우팅.
// (WindowClient.navigate 는 같은 path 에 query 만 다른 경우 페이지가 query 변경을
//  감지하지 못하는 경우가 있어, ?detail=<id> 같은 자동 다이얼로그 오픈이 안 떴음)
export function useNotificationNavigate(): void {
  const router = useRouter();
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    function handle(e: MessageEvent) {
      if (
        e.data?.type === "notification-click" &&
        typeof e.data?.url === "string"
      ) {
        router.push(e.data.url);
      }
    }
    navigator.serviceWorker.addEventListener("message", handle);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handle);
  }, [router]);
}
