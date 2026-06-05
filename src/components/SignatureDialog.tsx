"use client";

import { useRef, useState } from "react";
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

// 전자 서명 다이얼로그 — 약관 동의를 체크박스 대신 실제 사인으로 받는다.
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
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">{header}</h2>
          <p className="mt-1.5 text-sm/6 text-gray-600">{pledge}</p>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm font-medium text-gray-700">
            아래 빈 칸에 손가락 또는 마우스로 서명해 주세요.
          </p>
          {/* 서명 영역 — 고정 높이 (모바일·PC 모두 충분한 그리기 공간) */}
          <div className="mt-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <SignaturePad ref={padRef} className="h-48 w-full" />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-300 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            다시 그리기
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-primary px-5 py-2.5 text-base font-semibold text-white hover:bg-primary-hover"
            >
              서명 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
