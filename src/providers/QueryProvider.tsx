"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// TanStack Query Provider — 서버 데이터 캐싱·로딩·에러 상태 담당.
// 루트 레이아웃에서 전체 앱을 감싼다.
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

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
