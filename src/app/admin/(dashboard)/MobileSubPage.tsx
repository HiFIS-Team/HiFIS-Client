"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { type ReactNode } from "react";

// 프로필 페이지에서 진입하는 서브 페이지 (관리자 관리, 패치 노트 등) 의 모바일 풀스크린 wrapper.
// 모바일 :
//   - fixed inset-0 z-50 으로 layout 의 헤더·하단 탭바까지 전부 덮음
//   - 우측 → 좌측 슬라이드 인 애니메이션 (animate-slide-in-right)
//   - 좌측 상단 ← 뒤로 + 타이틀 자체 헤더
// PC(lg+) :
//   - lg:static lg:bg-transparent 로 풀스크린 해제, layout 안에서 일반 페이지처럼
//   - 자체 헤더는 lg:hidden — PC 는 layout 의 GlobalHeader 가 페이지 타이틀을 노출하므로 중복 X
export function MobileSubPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="animate-slide-in-right fixed inset-0 z-50 flex flex-col bg-white lg:static lg:animate-none lg:bg-transparent">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-gray-200 bg-white px-2 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1 className="text-base font-black tracking-tight text-gray-900">
          {title}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:overflow-visible lg:px-0 lg:py-0">
        {children}
      </div>
    </div>
  );
}
