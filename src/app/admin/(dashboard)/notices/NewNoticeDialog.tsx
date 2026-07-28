"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellAlertIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { createNotice } from "@/lib/api/v2/notices";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 새 공지 작성 — POST /notices.
// 백엔드가 게시 시 재직 중 전 직원(작성자 제외) 에게 알림 · 웹푸시 자동 발송.
// 그래서 "전체 알림 발송" 토글은 없고, 안내 배너로 대체.

interface NewNoticeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewNoticeDialog({ open, onClose }: NewNoticeDialogProps) {
  useEscapeKey(onClose, open);

  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const mutation = useMutation({
    mutationFn: createNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "notices"] });
      reset();
      onClose();
    },
  });

  const canSubmit =
    title.trim().length > 0 && body.trim().length > 0 && !mutation.isPending;

  if (!open) return null;

  function reset() {
    setTitle("");
    setBody("");
    setPinned(false);
    mutation.reset();
  }

  function submit() {
    if (!canSubmit) return;
    mutation.mutate({ title: title.trim(), body: body.trim(), pinned });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogGradientHeader
          kicker="NEW NOTICE"
          title="새 공지 작성"
          onClose={onClose}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* 제목 */}
          <Field label="제목" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 5월 전사 정기 미팅 일정 안내"
              maxLength={80}
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 본문 */}
          <Field label="본문" required>
            <div className="relative">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                maxLength={5000}
                placeholder={"일시·장소·안건 등 필요한 내용을 자유롭게 작성해 주세요.\n\n줄바꿈은 그대로 표시됩니다."}
                className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted tabular-nums">
                {body.length}/5000
              </span>
            </div>
          </Field>

          {/* 옵션 : 상단 고정 */}
          <div>
            <p className="text-sm font-semibold text-fg">옵션</p>
            <div className="mt-2 space-y-2">
              <ToggleRow
                icon={<SparklesIcon className="size-4 text-amber-400" />}
                label="상단 고정"
                hint="목록 최상단에 노란 · 고정 뱃지와 함께 표시됩니다."
                checked={pinned}
                onChange={setPinned}
              />
            </div>
          </div>

          {/* 알림 안내 (서버가 자동 발송) */}
          <div className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary/90">
            <BellAlertIcon className="size-4 shrink-0" />
            <span>
              게시와 동시에 재직 중인 전 직원에게 알림이 자동 발송됩니다.
            </span>
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
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
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "게시 중…" : "게시"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Field ───────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-fg">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// ─────────────── ToggleRow ───────────────

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-card-hover px-4 py-3 transition-colors hover:bg-card">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-card">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-line"
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
