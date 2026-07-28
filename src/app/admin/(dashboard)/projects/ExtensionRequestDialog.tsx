"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// 프로젝트 기한 연장 요청 다이얼로그 — UI 만.
// 승인 워크플로우 (어드민이 승인/반려) 는 v2 백엔드에 붙는 시점.
// 슬림 헤더 (문서함 다이얼로그와 톤 통일).

interface ExtensionRequestDialogProps {
  open: boolean;
  currentDue: string; // "7/31" 표기용
  onClose: () => void;
}

export function ExtensionRequestDialog({
  open,
  currentDue,
  onClose,
}: ExtensionRequestDialogProps) {
  useEscapeKey(onClose, open);

  const [newDue, setNewDue] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setNewDue("");
    setReason("");
  }, [open]);

  if (!open) return null;

  const canSubmit = reason.trim().length > 0;

  function submit() {
    // TODO: v2 /projects/{id}/extend 요청 API (body: { new_due, reason }).
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 슬림 헤더 : 제목 + 서브 + X */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-fg">기한 연장 요청</h2>
            <p className="mt-0.5 text-xs text-muted">
              현재 마감{" "}
              <span className="font-semibold text-fg">{currentDue}</span>{" "}
              <span className="text-line">·</span> 어드민 승인 필요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* 새 마감 날짜 */}
          <div>
            <label className="block text-sm font-semibold text-fg">
              새 마감 날짜
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2.5 focus-within:border-primary">
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm tabular-nums text-fg placeholder-muted focus:outline-none"
              />
              <svg
                viewBox="0 0 24 24"
                className="size-4 shrink-0 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* 사유서 */}
          <div>
            <label className="block text-sm font-semibold text-fg">
              사유서
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder="기한을 연장하려는 사유를 작성하세요."
              className="mt-2 w-full resize-y rounded-md border border-primary/50 bg-card-hover px-3 py-2.5 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* 푸터 : 취소 / 제출 (2열 grid) */}
        <div className="grid grid-cols-2 gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2.5 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            제출
          </button>
        </div>
      </div>
    </div>
  );
}
