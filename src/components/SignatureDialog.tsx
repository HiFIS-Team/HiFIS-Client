"use client";

import { useRef, useState } from "react";
import { PencilSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

interface SignatureDialogProps {
  open: boolean;
  // 서명자 이름 — 헤더에 "○○○ 님 서명" 으로 노출 (없으면 그냥 "전자 서명")
  name?: string;
  // 동의 대상 한 줄 요약 — 본인이 무엇에 동의하는지 컨텍스트
  pledge: string;
  onConfirm: (blob: Blob) => void;
  onClose: () => void;
}

// 전자 서명 다이얼로그 — 약관 동의를 체크박스와 함께 실제 사인으로 보강.
// 빈 사인은 확인 불가. PNG Blob 으로 부모에 전달.
export function SignatureDialog({
  open,
  name,
  pledge,
  onConfirm,
  onClose,
}: SignatureDialogProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose, open);

  if (!open) return null;

  const header = name ? `${name} 님 서명` : "전자 서명";

  function handleClear() {
    padRef.current?.clear();
    setError(null);
  }

  async function handleConfirm() {
    if (padRef.current?.isEmpty() ?? true) {
      setError("서명을 입력해 주세요.");
      return;
    }
    const blob = await padRef.current?.toBlob();
    if (!blob) {
      setError("서명을 처리하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    onConfirm(blob);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 sm:px-6 sm:py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 아이콘 칩 + 제목 + 우상단 닫기 */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-primary">
              <PencilSquareIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-gray-900">
                {header}
              </h2>
              <p className="mt-0.5 text-sm/5 text-gray-500">
                약관에 동의하신다는 확인
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-m-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* 본문 — 약관 요약 카드 + 서명 패드 */}
        <div className="px-6 py-5">
          <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3">
            <p className="text-sm/6 text-gray-700">{pledge}</p>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-700">
            아래 빈 칸에 손가락 또는 마우스로 서명해 주세요.
          </p>
          {/* 서명 영역 — 종이 카드 느낌. baseline 가이드는 캔버스 내부에 옅게. */}
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-inner">
            <SignaturePad ref={padRef} className="h-52 w-full" />
          </div>
          {error && (
            <p className="mt-2.5 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* 푸터 — "다시 그리기" 좌측, "취소 / 서명 완료" 우측 */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            다시 그리기
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 sm:flex-none"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-primary-hover sm:flex-none"
            >
              서명 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
