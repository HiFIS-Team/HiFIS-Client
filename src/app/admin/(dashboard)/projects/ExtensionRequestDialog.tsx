"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { createProjectRequest } from "@/lib/api/v2/projects";

// 프로젝트 기한 변경 요청 다이얼로그 — POST /projects/{id}/requests.
// type : 마감 전이면 EXTENSION, 이미 지났으면 OVERDUE (누락 사유).
// 어드민 승인 후 새 기한이 프로젝트에 반영됨.

interface ExtensionRequestDialogProps {
  open: boolean;
  projectId: string;
  currentDue: string; // "7/31" 표기
  overdue: boolean; // 이미 마감 지났는지 (EXTENSION vs OVERDUE 결정)
  onClose: () => void;
  onSubmitted: () => void;
}

export function ExtensionRequestDialog({
  open,
  projectId,
  currentDue,
  overdue,
  onClose,
  onSubmitted,
}: ExtensionRequestDialogProps) {
  useEscapeKey(onClose, open);

  const [newDue, setNewDue] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: { newDue: string; reason: string }) =>
      createProjectRequest(projectId, {
        type: overdue ? "OVERDUE" : "EXTENSION",
        newDue: new Date(`${payload.newDue}T00:00:00Z`).toISOString(),
        reason: payload.reason,
      }),
    onSuccess: () => onSubmitted(),
  });

  useEffect(() => {
    if (!open) return;
    setNewDue("");
    setReason("");
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSubmit =
    reason.trim().length > 0 && newDue.length > 0 && !mutation.isPending;

  function submit() {
    if (!canSubmit) return;
    mutation.mutate({ newDue, reason: reason.trim() });
  }

  const title = overdue ? "누락 사유 제출" : "기한 연장 요청";
  const label = overdue ? "누락" : "연장";

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
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-fg">{title}</h2>
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

          <div>
            <label className="block text-sm font-semibold text-fg">
              {label} 사유
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder={`${overdue ? "왜 늦어졌고 언제까지 끝내겠는지" : "기한을 연장하려는 사유를"} 작성하세요.`}
              className="mt-2 w-full resize-y rounded-md border border-primary/50 bg-card-hover px-3 py-2.5 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2.5 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "제출 중…" : "제출"}
          </button>
        </div>
      </div>
    </div>
  );
}
