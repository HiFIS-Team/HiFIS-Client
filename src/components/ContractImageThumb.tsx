"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { resolveStaticUrl } from "@/lib/api/client";

// 어드민 상세 화면에서 회원/PT 의 signature_url(종이 신청서 전체 이미지) 을
// 보여주는 컴포넌트. 썸네일 + 클릭 시 새 탭에서 원본 크기로 열림.
// signature_url 이 null 이면 "없음" 으로 대체.
export function ContractImageThumb({ url }: { url: string | null }) {
  if (!url) return <span className="text-gray-500">없음</span>;
  const full = resolveStaticUrl(url);
  return (
    <div className="space-y-1.5">
      <a
        href={full}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-fit max-w-full overflow-hidden rounded-md border border-gray-200 transition-shadow hover:shadow-md"
      >
        {/* 실제 종이 이미지는 세로로 길어서 max-h 로 제한, 너비는 콘텐츠 따라감. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={full}
          alt="신청서 이미지"
          className="block max-h-64 max-w-full object-contain"
        />
      </a>
      <a
        href={full}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        새 탭에서 크게 보기
        <ArrowTopRightOnSquareIcon className="size-3.5" />
      </a>
    </div>
  );
}
