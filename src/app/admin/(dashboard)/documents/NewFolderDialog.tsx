"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { SCOPE_OPTIONS, type Scope, ScopePicker } from "./scope";

// 새 폴더 생성 다이얼로그 — UI 만. 저장 로직은 API 붙는 시점에.
// 문서함 mockup 톤 — DialogGradientHeader 대신 슬림 헤더 (제목 + X + 얇은 border).

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewFolderDialog({ open, onClose }: NewFolderDialogProps) {
  useEscapeKey(onClose, open);

  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  // 열릴 때마다 초기화 — 이전 입력이 남지 않게.
  useEffect(() => {
    if (open) {
      setName("");
      setScope("all");
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = name.trim().length > 0;

  function submit() {
    // TODO: v2 폴더 생성 API 연동.
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
        {/* 슬림 헤더 — 제목 + X. */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-fg">새 폴더</h2>
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
          {/* 폴더 이름 */}
          <div>
            <label className="block text-sm font-semibold text-fg">폴더 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 회사규정, 양식모음"
              maxLength={50}
              autoFocus
              className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>

          {/* 공개 범위 */}
          <div>
            <label className="block text-sm font-semibold text-fg">공개 범위</label>
            <div className="mt-2">
              <ScopePicker value={scope} onChange={setScope} options={SCOPE_OPTIONS} />
            </div>
          </div>
        </div>

        {/* 푸터 : 우측 취소 / 생성 */}
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            생성
          </button>
        </div>
      </div>
    </div>
  );
}
