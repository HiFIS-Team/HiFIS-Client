"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// TanStack Query Provider — 서버 데이터 캐싱·로딩·에러 상태 담당.
// 루트 레이아웃에서 전체 앱을 감싼다.
//
// + Service Worker push 수신 시 어드민 query 즉시 갱신:
//   sw 가 push 받으면 모든 클라이언트에 postMessage → 여기서 받아
//   "admin" 키 prefix 전체 invalidate. 폴링 30초 기다리지 않고 즉시 반영.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 자동 재시도 끔 — 백엔드 호출 제한(429)을 두들기지 않기 위함
            // (claude.md Rate Limiting 규칙). 필요한 쿼리만 개별 opt-in.
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 60_000,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    function handle(e: MessageEvent) {
      if (e.data?.type === "push-received") {
        // 어떤 source_type 이든 어드민 데이터는 갱신 (회원·PT·예약·알림 등)
        queryClient.invalidateQueries({ queryKey: ["admin"] });
      }
    }
    navigator.serviceWorker.addEventListener("message", handle);
    return () => navigator.serviceWorker.removeEventListener("message", handle);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
