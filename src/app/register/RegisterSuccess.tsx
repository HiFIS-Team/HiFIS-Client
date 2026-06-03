"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";

// 신청 접수 완료 화면 — 회원가입 / PT / 재등록 공통.
// (이전 키오스크 흐름의 자동 리다이렉트 제거 — 폰에선 본인이 직접 닫음)
export function RegisterSuccess({
  title,
  name,
}: {
  title: string;
  name: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-violet-50 text-primary">
        <CheckCircleIcon className="size-14" />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-3 text-base text-gray-600">
        {name}님, 신청해 주셔서 감사합니다.
      </p>
      <p className="mt-2 text-sm text-gray-500">
        접수 확인 후 안내드릴 예정입니다.
      </p>
    </main>
  );
}
