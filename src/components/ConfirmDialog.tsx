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
  // true면 노랑 톤 — danger 보다 약한 경고 (예: 이력만 삭제, 원본은 유지).
  // danger 와 동시 지정 시 warning 이 우선 (의미상 더 약한 경고가 두 표기를 흡수).
  warning?: boolean;
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
  warning = false,
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

  // tone 우선순위: warning > danger > default.
  const tone: "default" | "danger" | "warning" = warning
    ? "warning"
    : danger
      ? "danger"
      : "default";
  const Icon = tone === "default" ? QuestionMarkCircleIcon : ExclamationTriangleIcon;
  const iconClass = {
    default: "bg-violet-50 text-primary",
    danger: "bg-red-50 text-red-500",
    warning: "bg-amber-50 text-amber-500",
  }[tone];
  const confirmBtnClass = {
    default: "bg-primary hover:bg-primary-hover",
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-amber-500 hover:bg-amber-600",
  }[tone];
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
          className={`mx-auto flex size-12 items-center justify-center rounded-full ${iconClass}`}
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
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${confirmBtnClass}`}
          >
            {loading ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
