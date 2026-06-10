"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { Checkbox } from "./Checkbox";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import type { TermsContent } from "./TermsDialog";

// 다짐 지점(첨단·동광주) 전용 — 종이 신청서 느낌의 통합 약관·서명 다이얼로그.
// 폼 state 가 가지고 있는 회원·상품 정보를 종이 위쪽에 그대로 표시해서
// 사용자가 자기가 적은 내용을 마지막으로 확인하고 사인하는 흐름을 만든다.
// "완료" 시 종이 영역(paperRef) 전체를 html2canvas 로 캡처해서 서버에 업로드 —
// 약관·동의 표시·서명·날짜·회원/상품 정보가 한 장의 종이 이미지로 박제된다.
// 어드민 상세에서는 그 이미지를 그대로 띄우면 됨.

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
  // 동의 + 서명 완료 콜백 — 종이 전체를 캡처한 JPEG Blob 전달.
  // (서명만이 아니라 약관·동의·정보·서명·날짜가 한 장으로 박힌 신청서 이미지)
  onConfirm: (contractImage: Blob) => void;
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
  // 캡처 대상 — 종이(흰 영역) 컨테이너. html2canvas 로 이 div 의 자식 전부 PNG/JPEG 화.
  const paperRef = useRef<HTMLDivElement>(null);
  // 모달 안에서 받는 동의 — 체크 + 서명 둘 다 있어야 "완료" 활성.
  const [agreed, setAgreed] = useState(false);
  // 서명 상태: 빈 칸 → 한 획이라도 그려짐 → "서명 완료" 눌러서 잠금.
  // 잠긴 후엔 "다시 그리기" 눌러야 다시 그릴 수 있음.
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 캡처 중 상태 — "완료" 누른 직후 잠깐 로딩 (html2canvas 가 동기적이지 않음).
  const [capturing, setCapturing] = useState(false);
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

  // 캡처 직전에 서명 <canvas> 를 PNG <img> 로 임시 교체.
  // 이유 : html2canvas-pro 가 prod 모바일(특히 iOS Safari, DPR 3) 에서 canvas 요소를
  // 잡을 때 DPR 스케일과 충돌해서 캔버스 자체뿐 아니라 부모 박스(테두리/배경) 까지
  // 렌더가 깨지는 케이스가 있음. 일반 <img> 로 바꿔두면 html2canvas 가 단순 이미지로
  // 처리해서 박스·서명 모두 정상 캡처. 캡처 후 함수가 반환한 restore() 로 원복.
  async function swapSignatureForCapture(): Promise<() => void> {
    const root = paperRef.current;
    if (!root) return () => {};
    const canvas = root.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return () => {};
    const dataUrl = canvas.toDataURL("image/png");
    const rect = canvas.getBoundingClientRect();
    const img = document.createElement("img");
    img.src = dataUrl;
    img.style.width = `${rect.width}px`;
    img.style.height = `${rect.height}px`;
    img.style.display = "block";
    img.className = canvas.className;
    canvas.style.display = "none";
    canvas.parentElement?.insertBefore(img, canvas);
    // img 로드 보장 — dataURL 이라 동기 가능성 높지만 안전망
    await new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
    return () => {
      canvas.style.display = "";
      img.remove();
    };
  }

  // 종이 영역 전체를 한 장의 이미지로 캡처. 컨트롤(다시 그리기·서명 완료·에러문구) 은
  // data-capture-ignore 속성으로 제외해서 신청서 본문만 남게 함.
  //
  // 캡처 전 처리 :
  // 1) 폰트(Pretendard) 로딩 대기 — fallback 메트릭으로 레이아웃이 잡혀 글자가 잘리는 문제 회피
  // 2) 서명 <canvas> → <img> 교체 — 모바일 prod 에서 박스/서명이 깨지는 문제 회피
  // 3) 한 프레임 더 대기 — 폰트 적용 + img 반영 후 레이아웃 안정화
  async function captureContract(): Promise<Blob | null> {
    const el = paperRef.current;
    if (!el) return null;

    if (typeof document !== "undefined" && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // 폰트 promise 가 실패해도 진행 (fallback 폰트로 캡처)
      }
    }

    const restoreSignature = await swapSignatureForCapture();

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        // scale 1.5 — 종이가 길어서 2 로 잡으면 파일/픽셀 모두 부담. 1.5 도 글자 충분히 또렷.
        scale: 1.5,
        useCORS: true,
        ignoreElements: (n) =>
          n instanceof HTMLElement && n.dataset.captureIgnore === "true",
      });
      return await new Promise<Blob | null>((resolve) => {
        // 백엔드 signature 필드가 PNG 만 받음 → PNG 로 저장.
        // 약관 길이에 따라 1~2MB 정도 나옴.
        canvas.toBlob((b) => resolve(b), "image/png");
      });
    } finally {
      restoreSignature();
    }
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
    setError(null);
    setCapturing(true);
    try {
      const blob = await captureContract();
      if (!blob) {
        setError("신청서를 처리하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      onConfirm(blob);
    } finally {
      setCapturing(false);
    }
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
        {/* 헤더 — 닫기 버튼만 슬림하게 (제목은 종이 안쪽으로 이동) */}
        <div className="flex justify-end border-b border-gray-200 bg-gray-50 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-m-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* 스크롤 컨테이너 — 종이가 길어지면 여기서 스크롤. 캡처는 안쪽 paperRef 만. */}
        <div className="flex-1 overflow-y-auto">
          {/* 종이 — 흰 배경. 이 div 자체가 html2canvas 캡처 대상. */}
          <div
            ref={paperRef}
            className="bg-white px-6 py-6 text-gray-900 sm:px-10 sm:py-8"
          >
            {/* 제목 — 종이 맨 위. 캡처 결과 신청서의 머리말이 됨. */}
            <h2 className="text-center text-lg font-bold sm:text-xl">
              {headerTitle}
            </h2>

            <div className="mt-6">
              {/* 회원 정보 / 상품 결제 정보 — 폼이 build 해서 prop 으로 넘긴 라벨/값 */}
              {memberInfo && memberInfo.length > 0 && (
                <InfoSection title="회원 정보" lines={memberInfo} />
              )}
              {productInfo && productInfo.length > 0 && (
                <div
                  className={memberInfo && memberInfo.length > 0 ? "mt-6" : ""}
                >
                  <InfoSection title="상품 결제 정보" lines={productInfo} />
                </div>
              )}

              <h3
                className={`text-center text-lg font-bold text-gray-900 ${
                  (memberInfo && memberInfo.length > 0) ||
                  (productInfo && productInfo.length > 0)
                    ? "mt-8"
                    : ""
                }`}
              >
                이용약관
              </h3>

              <div className="mt-4 space-y-4">
                {terms.sections.map((s, si) => (
                  <section key={si} className="break-inside-avoid">
                    {s.heading && (
                      <h4 className="text-[14px] font-bold text-gray-900">
                        {s.heading}
                      </h4>
                    )}
                    <div className={`space-y-1 ${s.heading ? "mt-1.5" : ""}`}>
                      {s.body.map((p, i) => (
                        <p
                          key={i}
                          className="text-[12.5px] leading-[1.55] text-gray-800"
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {/* 동의·날짜·서명 구역 — 종이 신청서 하단처럼 */}
              <div className="mt-8 border-t border-gray-300 pt-6">
                {/* 동의 박스 — inline 색은 prod 모바일 html2canvas 가 oklch 를 못
                    잡는 경우 대비 안전망 (Tailwind v4 색이 prod 빌드에서 oklch 로
                    노출되는 케이스가 모바일에서 가끔 깨져 보임) */}
                <div
                  className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                  style={{
                    backgroundColor: "rgb(249, 250, 251)",
                    borderColor: "rgb(229, 231, 235)",
                  }}
                >
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
                {/* 날짜(좌) · 서명(우) — 다짐 종이 신청서처럼 가로 배치.
                    모바일은 세로 스택(날짜 위, 서명 아래), sm 이상은 가로 + 세로 가운데. */}
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                  {/* 좌: 날짜 — 가운데(세로) 정렬, 큰 글자. 모바일은 가운데 정렬. */}
                  <div className="shrink-0 text-center sm:text-left">
                    <p className="text-lg font-bold text-gray-900 sm:text-xl">
                      {todayLabel()}
                    </p>
                  </div>

                  {/* 우: 회원 이름 + 서명 캔버스 + 컨트롤 */}
                  <div className="min-w-0 flex-1">
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
                        "서명 완료" 누르면 잠겨서 더 못 그리게, "다시 그리기" 로 풀림.
                        잠긴 상태에선 테두리 색이 primary 로 바뀌고 우상단에 ✓ 뱃지. */}
                    {/* 서명 박스 — prod 모바일에서 oklch 색이 캡처 시 평탄화되지
                        않아 박스 자체가 사라져 보이는 케이스 회피. inline rgb 가
                        oklch 보다 우선이라 캡처 결과가 안정적. */}
                    <div
                      className={`relative mt-2 overflow-hidden rounded-md border-2 transition-colors ${
                        isLocked
                          ? "border-primary bg-primary/5"
                          : "border-gray-400 bg-gray-50"
                      }`}
                      style={{
                        backgroundColor: isLocked
                          ? "rgba(124, 58, 237, 0.05)"
                          : "rgb(249, 250, 251)",
                        borderColor: isLocked
                          ? "rgb(124, 58, 237)"
                          : "rgb(156, 163, 175)",
                      }}
                    >
                      <SignaturePad
                        ref={padRef}
                        className="h-32 w-full"
                        onStrokeEnd={() => setHasDrawn(true)}
                      />
                      {!hasDrawn && !isLocked && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="text-base text-gray-400">
                            (서명)
                          </span>
                        </div>
                      )}
                      {isLocked && (
                        <div
                          className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                          data-capture-ignore="true"
                        >
                          <CheckIcon className="size-3.5" />
                          서명 완료
                        </div>
                      )}
                    </div>
                    {/* 서명 영역 버튼: 다시 그리기 / 서명 완료. 잠그면 다시 그리기만 활성.
                        캡처 시 신청서 문서엔 나오면 안 되므로 data-capture-ignore. */}
                    <div
                      className="mt-2 flex justify-end gap-2"
                      data-capture-ignore="true"
                    >
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
                      <p
                        className="mt-2 text-sm text-red-600"
                        role="alert"
                        data-capture-ignore="true"
                      >
                        {error}
                      </p>
                    )}
                  </div>
                </div>

                {/* 대표자 — 고정 문구 (양 지점 공통) */}
                <div className="mt-8 border-t border-gray-200 pt-5 text-center">
                  <p className="text-base font-medium text-gray-900">
                    피트니스스타{branchName ? ` ${branchName}` : ""} 헬스 PT
                  </p>
                  <p className="mt-1 text-base text-gray-700">문명진, 이준경</p>
                </div>
              </div>
            </div>
            {/* /mt-8 wrapper */}
          </div>
          {/* /paperRef */}
        </div>
        {/* /scroll container */}

        {/* 푸터 — 취소 / 완료 (고정) */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={capturing}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={capturing}
            className="rounded-lg bg-primary px-6 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {capturing ? "신청서 저장 중…" : "완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
