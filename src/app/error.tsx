"use client";

import { useEffect } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// React 렌더 오류 경계 — 일시적 오류 시 브랜드 톤 안내 + 재시도.
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
        <ExclamationTriangleIcon className="size-12" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-fg">
        일시적인 오류가 발생했습니다
      </h1>
      <p className="mt-3 text-base text-gray-600 dark:text-muted">
        잠시 후 다시 시도해 주세요.
      </p>
      <div className="mt-8 flex gap-2">
        <button
          type="button"
          onClick={() => history.back()}
          className="rounded-md border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-100 dark:border-line dark:text-fg dark:hover:bg-card-hover"
        >
          이전으로
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-hover"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
