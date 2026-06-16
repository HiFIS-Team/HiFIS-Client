"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { resolveStaticUrl } from "@/lib/api/client";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// 어드민 상세에서 회원/PT 의 signature_url(종이 신청서 전체 이미지) 을 표시.
// 썸네일 클릭 시 같은 화면 위에 lightbox 모달 — 새 탭으로 안 빠지고
// 현재 상세 컨텍스트 유지한 채 종이만 확대해서 확인 가능.
export function ContractImageThumb({ url }: { url: string | null }) {
  const [open, setOpen] = useState(false);
  useEscapeKey(() => setOpen(false), open);

  if (!url) return <span className="text-muted">없음</span>;
  const full = resolveStaticUrl(url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-fit max-w-full overflow-hidden rounded-md border border-line bg-white transition-shadow hover:shadow-md"
        aria-label="신청서 크게 보기"
      >
        {/* 종이는 세로로 김 → max-h 로 썸네일 압축, 클릭 시 모달에서 풀사이즈. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={full}
          alt="신청서 이미지"
          className="block max-h-64 max-w-full object-contain"
        />
      </button>
      <p className="mt-1.5 text-xs text-muted">
        클릭하면 크게 볼 수 있어요
      </p>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="신청서 전체 보기"
          className="animate-fade-in fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          {/* 닫기 버튼 — 우상단 고정 (스크롤해도 항상 보이게) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="닫기"
            className="fixed right-4 top-4 z-10 rounded-full bg-white/95 p-2 text-gray-900 shadow-lg hover:bg-white"
          >
            <XMarkIcon className="size-6" />
          </button>
          {/* 종이 컨테이너 — 가운데 정렬, 폭 제한, 이미지 자체로 스크롤 */}
          <div className="mx-auto max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={full}
              alt="신청서 전체"
              className="block w-full"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
