"use client";

import { useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { Checkbox } from "./Checkbox";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import type { TermsContent } from "./TermsDialog";

// 다짐 지점(첨단·동광주) 전용 — 종이 신청서 느낌의 통합 약관·서명 다이얼로그.
// 폼 state 가 가지고 있는 회원·상품 정보를 종이 위쪽에 그대로 표시해서
// 사용자가 자기가 적은 내용을 마지막으로 확인하고 사인하는 흐름을 만든다.
// 어드민 상세에서 같은 양식을 다시 렌더링하면 그 시점 약관·서명·시각이 모두 복원되므로
// 별도의 종이 사본을 저장할 필요가 없다.

// 종이 위 정보 박스의 한 줄 — 라벨/값 쌍.
export interface ContractInfoLine {
  label: string;
  value: string;
}

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
  // 종이 위쪽 "회원 정보" 박스 — 폼에서 만들어 전달.
  // 비어있으면 박스 자체를 안 보임.
  memberInfo?: ContractInfoLine[];
  // 종이 위쪽 "상품 결제 정보" 박스 — 폼에서 만들어 전달.
  productInfo?: ContractInfoLine[];
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

// 종이 위 정보 박스 — "회원 정보" / "상품 결제 정보" 공통 레이아웃.
// 좌측 라벨(고정폭) + 우측 값. 값이 비어있으면 "—".
function InfoSection({
  title,
  lines,
}: {
  title: string;
  lines: ContractInfoLine[];
}) {
  return (
    <section>
      <h4 className="border-b-2 border-gray-300 pb-1.5 text-base font-bold text-gray-900">
        {title}
      </h4>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
        {lines.map((line, i) => (
          <div key={i} className="contents">
            <dt className="font-medium text-gray-600">{line.label}</dt>
            <dd className="text-gray-900">{line.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ContractDialog({
  open,
  kind,
  branchName,
  terms,
  memberName,
  memberInfo,
  productInfo,
  onConfirm,
  onClose,
}: ContractDialogProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  // 모달 안에서 받는 동의 — 체크 + 서명 둘 다 있어야 "완료" 활성.
  const [agreed, setAgreed] = useState(false);
  // 서명 상태: 빈 칸 → 한 획이라도 그려짐 → "서명 완료" 눌러서 잠금.
  // 잠긴 후엔 "다시 그리기" 눌러야 다시 그릴 수 있음.
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose, open);

  if (!open) return null;

  const headerTitle = `피트니스스타${branchName ? ` ${branchName}` : ""} ${
    kind === "pt" ? "PT" : "회원가입"
  } 신청서`;

  function handleRedraw() {
    padRef.current?.clear();
    padRef.current?.setEnabled(true);
    setHasDrawn(false);
    setIsLocked(false);
    setError(null);
  }

  function handleSignDone() {
    if (!hasDrawn) return;
    padRef.current?.setEnabled(false);
    setIsLocked(true);
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

        {/* 본문 — 종이처럼 흰 배경. 회원정보·상품정보·약관·동의·서명 순으로 한 종이 안에. */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
          {/* 회원 정보 / 상품 결제 정보 — 폼이 build 해서 prop 으로 넘긴 라벨/값 */}
          {memberInfo && memberInfo.length > 0 && (
            <InfoSection title="회원 정보" lines={memberInfo} />
          )}
          {productInfo && productInfo.length > 0 && (
            <div className={memberInfo && memberInfo.length > 0 ? "mt-6" : ""}>
              <InfoSection title="상품 결제 정보" lines={productInfo} />
            </div>
          )}

          <h3 className={`text-center text-xl font-bold text-gray-900 ${
            (memberInfo && memberInfo.length > 0) || (productInfo && productInfo.length > 0)
              ? "mt-10"
              : ""
          }`}>
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
              {/* 종이 위 서명란 — 본문과 구분되는 옅은 회색 + 굵은 테두리.
                  빈 상태에선 가운데 "(서명)" 안내 노출, 한 획이라도 그리면 사라짐.
                  "서명 완료" 누르면 잠겨서 더 못 그리게, "다시 그리기" 로 풀림. */}
              <div className="relative mt-2 overflow-hidden rounded-md border-2 border-gray-400 bg-gray-50">
                <SignaturePad
                  ref={padRef}
                  className="h-40 w-full"
                  onStrokeEnd={() => setHasDrawn(true)}
                />
                {!hasDrawn && !isLocked && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-base text-gray-400">(서명)</span>
                  </div>
                )}
              </div>
              {/* 서명 영역 버튼: 다시 그리기 / 서명 완료. 잠그면 다시 그리기만 활성. */}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleRedraw}
                  disabled={!hasDrawn && !isLocked}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다시 그리기
                </button>
                <button
                  type="button"
                  onClick={handleSignDone}
                  disabled={!hasDrawn || isLocked}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  서명 완료
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
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
