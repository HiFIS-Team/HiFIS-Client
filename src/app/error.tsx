"use client";

import { useEffect } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// React 렌더 오류 경계 — 일시적 오류 시 브랜드 톤 안내 + 재시도.
// admin 트리 밖에서도 뜰 수 있어 dark variant 대신 다크 톤 하드코딩.
// data-theme="dark" 를 wrapper 에 걸어 이 페이지 내부 토큰(text-fg, text-muted 등) 이 다크 셋으로 해석되게.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 운영 시 외부 로깅 연동 자리 (Sentry 등)
    console.error(error);
  }, [error]);

  return (
    <main
      data-theme="dark"
      className="fixed inset-0 flex flex-col items-center justify-center bg-surface px-6 py-10 text-center"
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <ExclamationTriangleIcon className="size-12" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tighter text-fg">
        일시적인 오류가 발생했습니다
      </h1>
      <p className="mt-3 text-base text-muted">잠시 후 다시 시도해 주세요.</p>
      <div className="mt-8 flex gap-2">
        <button
          type="button"
          onClick={() => history.back()}
          className="rounded-md border border-line px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-card-hover"
        >
          이전으로
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-primary bg-primary/25 px-5 py-2.5 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
