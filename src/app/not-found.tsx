"use client";

import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

// 잘못된 URL 진입 시 — 브랜드 톤 404.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-violet-50 text-primary">
        <QuestionMarkCircleIcon className="size-12" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 text-base text-gray-600">
        주소를 다시 확인해 주세요.
      </p>
      <button
        type="button"
        onClick={() => history.back()}
        className="mt-8 rounded-md bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-hover"
      >
        이전 페이지로
      </button>
    </main>
  );
}
