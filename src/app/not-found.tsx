"use client";

import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

// 잘못된 URL 진입 시 — 브랜드 톤 404.
// admin 트리 밖에서도 뜰 수 있어 dark variant 대신 다크 톤 하드코딩.
export default function NotFound() {
  return (
    <main
      data-theme="dark"
      className="fixed inset-0 flex flex-col items-center justify-center bg-surface px-6 py-10 text-center"
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary">
        <QuestionMarkCircleIcon className="size-12" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tighter text-fg">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 text-base text-muted">주소를 다시 확인해 주세요.</p>
      <button
        type="button"
        onClick={() => history.back()}
        className="mt-8 rounded-md border border-primary bg-primary/25 px-5 py-2.5 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
      >
        이전 페이지로
      </button>
    </main>
  );
}
