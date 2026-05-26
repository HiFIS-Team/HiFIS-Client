"use client";

import type { ReactNode } from "react";
import {
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  // true면 확인 버튼이 빨강 + 상단 경고 아이콘 (삭제 등 파괴적 작업)
  danger?: boolean;
  loading?: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const Icon = danger ? ExclamationTriangleIcon : QuestionMarkCircleIcon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
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
            disabled={loading}
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
