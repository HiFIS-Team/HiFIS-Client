"use client";

import { useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { Checkbox } from "./Checkbox";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import type { TermsContent } from "./TermsDialog";

// 다짐 지점(첨단·동광주) 전용 — 종이 신청서 느낌의 통합 약관·서명 다이얼로그.
// 회원 정보·상품 정보는 DB 저장 후 별도 화면에서 보이므로 여기서는 표시하지 않고,
// 종이 양식에서 법적 효력이 있는 "이용약관 + 동의 + 서명 + 대표자" 파트만 다룬다.
// 어드민 상세에서 같은 양식을 다시 렌더링하면 그 시점 약관·서명·시각이 모두 복원되므로
// 별도의 종이 사본을 저장할 필요가 없다.

interface ContractDialogProps {
  open: boolean;
  // "회원가입" / "PT" — 헤더에 들어감
  kind: "member" | "pt";
  // 지점명 (예: "동광주점") — 헤더에 들어감
  branchName: string;
  // 약관 본문 (DAJIM_MEMBER_TERMS 또는 DAJIM_PT_TERMS)
  terms: TermsContent;
  // 회원이 폼에 입력한 이름 — 서명 위 라벨에 표시 (비어있으면 "—")
  memberName: string;
  // 동의 + 서명 동시 완료 콜백 (서명 PNG Blob 전달)
  onConfirm: (signature: Blob) => void;
  onClose: () => void;
}

// 오늘 날짜 — "YYYY년 MM월 DD일"
function todayLabel(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}년 ${m}월 ${day}일`;
}

export function ContractDialog({
  open,
  kind,
  branchName,
  terms,
  memberName,
  onConfirm,
  onClose,
}: ContractDialogProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  // 모달 안에서 받는 동의 — 체크 + 서명 둘 다 있어야 "완료" 활성.
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose, open);

  if (!open) return null;

  const headerTitle = `피트니스스타${branchName ? ` ${branchName}` : ""} ${
    kind === "pt" ? "PT" : "회원가입"
  } 신청서`;

  function handleClear() {
    padRef.current?.clear();
    setError(null);
  }

  async function handleConfirm() {
    if (!agreed) {
      setError("위 내용에 동의하셔야 신청이 가능합니다.");
      return;
    }
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
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 sm:px-6 sm:py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 신청서 제목 + 닫기 (고정) */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">
            {headerTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-m-1 shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* 본문 — 종이처럼 흰 배경. 약관·동의·날짜·서명·대표자 순으로 한 종이 안에. */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
          <h3 className="text-center text-xl font-bold text-gray-900">
            이용약관
          </h3>

          <div className="mt-6 space-y-6">
            {terms.sections.map((s, si) => (
              <section key={si}>
                {s.heading && (
                  <h4 className="text-base font-bold text-gray-900">
                    {s.heading}
                  </h4>
                )}
                <div className={`space-y-2 ${s.heading ? "mt-2" : ""}`}>
                  {s.body.map((p, i) => (
                    <p key={i} className="text-[15px]/7 text-gray-800">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* 동의·날짜·서명 구역 — 종이 신청서 하단처럼 */}
          <div className="mt-10 border-t border-gray-300 pt-8">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <Checkbox
                id="contract-agree"
                label="위 내용에 동의합니다. (필수)"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setError(null);
                }}
              />
            </div>
            <p className="mt-5 text-center text-base text-gray-700">
              {todayLabel()}
            </p>

            <div className="mt-8">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-medium text-gray-600">
                  회원 이름
                </span>
                <span className="flex-1 border-b border-gray-300 pb-0.5 text-base text-gray-900">
                  {memberName || "—"}
                </span>
                <span className="text-sm text-gray-500">(서명)</span>
              </div>
              {/* 종이 위 서명란 — touch-none 으로 스크롤 제스처 차단 */}
              <div className="mt-2 overflow-hidden rounded-md border border-gray-300 bg-white">
                <SignaturePad ref={padRef} className="h-40 w-full" />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
                >
                  다시 그리기
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            {/* 대표자 — 고정 문구 (양 지점 공통) */}
            <div className="mt-10 border-t border-gray-200 pt-6 text-center">
              <p className="text-base font-medium text-gray-900">
                피트니스스타{branchName ? ` ${branchName}` : ""} 헬스 PT
              </p>
              <p className="mt-1 text-base text-gray-700">문명진, 이준경</p>
            </div>
          </div>
        </div>

        {/* 푸터 — 취소 / 동의 + 서명 완료 (고정) */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-primary px-6 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            동의 + 서명 완료
          </button>
        </div>
      </div>
    </div>
  );
}
