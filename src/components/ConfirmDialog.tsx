"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  // true면 확인 버튼이 빨강 + 상단 경고 아이콘 (삭제 등 파괴적 작업)
  danger?: boolean;
  loading?: boolean;
  // 지정 시 사용자가 정확히 이 텍스트를 입력해야 확인 버튼이 활성화 — 실수 방지 안전망.
  // 회원 삭제처럼 영향이 큰 작업에 사용.
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// 작업 전 확인 모달. 삭제 등 되돌릴 수 없는 작업에 사용.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  danger = false,
  loading = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEscapeKey(onCancel, open);
  // 입력란 — 다이얼로그 열릴 때마다 초기화.
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);
  if (!open) return null;

  const Icon = danger ? ExclamationTriangleIcon : QuestionMarkCircleIcon;
  // requireText 없으면 항상 충족. 있으면 정확 일치만 (공백/대소문자 차이도 거름).
  const requirementMet = !requireText || typed === requireText;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="animate-dialog-in w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto flex size-12 items-center justify-center rounded-full ${
            danger ? "bg-red-50 text-red-500" : "bg-violet-50 text-primary"
          }`}
        >
          <Icon className="size-6" />
        </div>
        {title && (
          <h2 className="mt-4 text-center text-lg font-bold text-gray-900">
            {title}
          </h2>
        )}
        <div className="mt-2 text-center text-sm/6 text-gray-600">
          {message}
        </div>
        {requireText && (
          <div className="mt-4 text-left">
            <label
              htmlFor="confirm-require-text"
              className="block text-xs text-gray-600"
            >
              계속하려면{" "}
              <span className="font-semibold text-gray-900">
                &quot;{requireText}&quot;
              </span>{" "}
              을(를) 입력해 주세요.
            </label>
            <input
              id="confirm-require-text"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
              className="mt-1.5 block w-full rounded-md border-0 px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !requirementMet}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {loading ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
