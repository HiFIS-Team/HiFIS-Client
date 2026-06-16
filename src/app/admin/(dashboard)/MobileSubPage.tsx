"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useState, type ReactNode } from "react";

// 모바일 풀스크린 서브 페이지 wrapper. 두 가지 방식으로 사용:
//   (a) 라우트 페이지 wrapper — onClose 미전달 → ← 누르면 router.back()
//       예) /admin/admins, /admin/release-notes 등 직접 URL 진입 케이스
//   (b) 인라인 panel — onClose 전달 → ← 누르면 callback (parent state 가
//       unmount 결정). parent 가 그대로 mount 상태라 슬라이드 인/아웃 동안
//       parent 가 뒤에서 보임 — 진짜 iOS 네비 스택 톤. 프로필 → 관리자 관리.
//
// 모바일 :
//   - fixed inset-0 z-50 으로 layout 의 헤더·하단 탭바까지 전부 덮음
//   - 진입 시 우측 → 좌측 슬라이드 인 (animate-page-slide-in)
//   - ← 누르면 좌→우 슬라이드 아웃 (animate-page-slide-out) 후 close
// PC(lg+) :
//   - lg:static lg:bg-transparent 로 풀스크린 해제, layout 안에서 일반 페이지처럼
//   - 자체 헤더는 lg:hidden — PC 는 layout 의 GlobalHeader 가 페이지 타이틀을 노출
export function MobileSubPage({
  title,
  onClose,
  noScroll = false,
  children,
}: {
  title: string;
  onClose?: () => void;
  // 콘텐츠가 화면에 다 들어가는 짧은 폼 (예: 동료 평가) 에서 overscroll bounce
  // 와 불필요한 스크롤을 막을 때 true. 기본은 false (스크롤 허용).
  noScroll?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  // closing : ← 누른 직후 → 슬라이드 아웃 애니메이션 적용 → onAnimationEnd 에서 close.
  const [closing, setClosing] = useState(false);

  function handleClose() {
    if (closing) return;
    setClosing(true);
  }

  function handleAnimationEnd() {
    if (!closing) return;
    if (onClose) onClose();
    else router.back();
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-surface pt-12 lg:static lg:animate-none lg:overflow-visible lg:bg-transparent lg:pt-0 ${
        noScroll ? "overflow-hidden" : "overflow-y-auto"
      } ${closing ? "animate-page-slide-out" : "animate-page-slide-in"}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {/* 헤더 fixed — sticky 면 overscroll bounce 때 같이 끌려오던 문제 (글로벌
          헤더와 동일 패턴). outer 의 pt-12 가 fixed 헤더 자리만큼 padding 으로
          밀어내 in-flow 콘텐츠가 헤더 뒤로 깔리지 않게 함. */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-12 items-center gap-1 border-b border-line bg-card px-2 lg:hidden">
        <button
          type="button"
          onClick={handleClose}
          aria-label="뒤로"
          className="rounded-md p-2 text-fg hover:bg-card-hover"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1 className="text-base font-black tracking-tight text-fg">
          {title}
        </h1>
      </header>
      <div className="px-4 py-4 lg:px-0 lg:py-0">{children}</div>
    </div>
  );
}
