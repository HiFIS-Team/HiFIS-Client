"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

// 신청 접수 완료 화면 — 회원가입 / PT 공통.
// 5초 카운트다운 후 자동으로 키오스크 진입 화면으로 복귀.
const REDIRECT_SECONDS = 5;

export function KioskSuccess({
  title,
  name,
}: {
  title: string;
  name: string;
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (remaining <= 0) {
      // 뒤로가기로 성공 화면 재진입 방지 — replace 사용
      router.replace("/kiosk");
      return;
    }
    const t = setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      {/* 작은 로고 — 브랜드 마크 (성공 피드백은 아래 CheckCircle 이 담당) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        aria-hidden="true"
        className="mb-6 size-10"
      />
      <div className="flex size-24 items-center justify-center rounded-full bg-violet-50 text-primary">
        <CheckCircleIcon className="size-14" />
      </div>

      <h1 className="mt-6 text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-3 text-lg text-gray-600">
        {name}님, 신청해 주셔서 감사합니다.
      </p>

      <p className="mt-10 text-sm text-gray-500">
        <span className="font-semibold text-primary">{remaining}</span>초 후
        처음 화면으로 돌아갑니다.
      </p>
      <Link
        href="/kiosk"
        replace
        className="mt-4 inline-block rounded-md bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-hover"
      >
        지금 처음으로
      </Link>
    </main>
  );
}
