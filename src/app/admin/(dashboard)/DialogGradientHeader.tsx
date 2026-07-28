"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";

// 신청/생성 계열 모달 공용 헤더 — 그라디언트 배경(primary→violet) 위에
// 작은 kicker (대문자 tracking-widest) + 큰 굵은 제목 + 우측 X.
// 예: 일정 추가 (NEW EVENT), 휴가 신청 (NEW REQUEST).
export function DialogGradientHeader({
  kicker,
  title,
  onClose,
}: {
  kicker: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="relative bg-gradient-to-br from-primary to-violet-500 px-6 py-6 text-white">
      <p className="text-xs font-semibold tracking-widest">{kicker}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tighter">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );
}
