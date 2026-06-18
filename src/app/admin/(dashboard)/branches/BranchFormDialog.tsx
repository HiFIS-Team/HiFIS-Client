"use client";

import type { BranchInput } from "@/lib/api/branches";
import type { Branch } from "@/lib/api/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { BranchForm } from "./BranchForm";

interface BranchFormDialogProps {
  open: boolean;
  title: string;
  // 수정 시 기존 지점, 등록 시 null
  initial?: Branch | null;
  loading?: boolean;
  onSubmit: (values: BranchInput) => void;
  onCancel: () => void;
}

// 지점 등록·수정 폼 모달. 폼 본문은 BranchForm 컴포넌트가 담당.
// (등록은 헤더 + 버튼에서 모바일은 슬라이드 패널 / PC 는 이 모달 — 둘 다 BranchForm 공유)
export function BranchFormDialog({
  open,
  title,
  initial,
  loading = false,
  onSubmit,
  onCancel,
}: BranchFormDialogProps) {
  useEscapeKey(onCancel, open);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10"
      onClick={onCancel}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-md flex-col rounded-xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-line px-6 py-4 text-lg font-bold text-fg">
          {title}
        </h2>
        <div className="flex min-h-0 flex-col px-6 py-5">
          <BranchForm
            initial={initial}
            loading={loading}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}
