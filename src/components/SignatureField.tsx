"use client";

import { ArrowPathIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

// 폼 안에 들어가는 서명 위젯 — 다짐 지점에서 체크박스 아래 노출.
// 빈 상태: 큰 카드 버튼 (서명 유도). 서명 후: 미리보기 + "다시 서명" 액션.
// SignatureDialog 호출은 부모가 담당 (onOpen 콜백).
export function SignatureField({
  preview,
  onOpen,
  error,
}: {
  preview: string | null;
  onOpen: () => void;
  error?: string;
}) {
  if (preview) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="입력한 서명 미리보기"
            className="h-16 w-32 shrink-0 rounded-lg border border-violet-100 bg-white object-contain"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <span
                aria-hidden="true"
                className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-white"
              >
                ✓
              </span>
              전자서명 완료
            </p>
            <p className="text-xs text-gray-500">
              내용을 바꾸려면 다시 서명해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowPathIcon className="size-3.5" />
            다시 서명
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 px-4 py-4 text-left hover:border-primary hover:bg-violet-50"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
          <PencilSquareIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-gray-900">
            전자서명 입력
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            손가락 또는 마우스로 사인해 주세요.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="hidden shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white group-hover:inline-block"
        >
          서명하기
        </span>
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
