"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { createFolder } from "@/lib/api/v2/documents";
import { SCOPE_OPTIONS, type Scope, ScopePicker } from "./scope";

// 새 폴더 생성 — POST /folders.
// space 는 상위 페이지의 현재 workspace pill 값을 기본값으로 받음 (전체면 "" — 저장 안 함).

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSpace: string;
  onCreated: () => void;
}

export function NewFolderDialog({
  open,
  onClose,
  defaultSpace,
  onCreated,
}: NewFolderDialogProps) {
  useEscapeKey(onClose, open);

  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const mutation = useMutation({
    mutationFn: createFolder,
    onSuccess: () => onCreated(),
  });

  useEffect(() => {
    if (!open) return;
    setName("");
    setScope("all");
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSubmit = name.trim().length > 0 && !mutation.isPending;

  function submit() {
    if (!canSubmit) return;
    mutation.mutate({
      name: name.trim(),
      scope,
      // space 는 필수 문자열 — workspace 미선택("전체") 이면 빈 문자열이라도 보내야 백엔드가 받음.
      space: defaultSpace,
    });
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
          <div>
            <label className="block text-sm font-semibold text-fg">
              폴더 이름
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 회사규정, 양식모음"
              maxLength={50}
              autoFocus
              className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-fg">
              공개 범위
            </label>
            <div className="mt-2">
              <ScopePicker
                value={scope}
                onChange={setScope}
                options={SCOPE_OPTIONS}
              />
            </div>
          </div>

          {defaultSpace && (
            <p className="text-xs text-muted">
              워크스페이스:{" "}
              <span className="font-semibold text-fg">{defaultSpace}</span>
            </p>
          )}

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "생성 중…" : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
