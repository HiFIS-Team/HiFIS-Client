"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { createLeave, type LeaveType } from "@/lib/api/v2/attendance";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 휴가 신청 — POST /leaves. 백엔드가 반차면 0.5 자동 계산.
// 반차는 종료일 = 시작일 강제.

interface TypeOption {
  key: LeaveType;
  label: string;
  dot: string;
}
const TYPES: TypeOption[] = [
  { key: "ANNUAL", label: "연차", dot: "bg-primary" },
  { key: "HALF", label: "반차", dot: "bg-violet-400" },
  { key: "SICK", label: "병가", dot: "bg-red-400" },
  { key: "FIELD", label: "외근", dot: "bg-emerald-400" },
  { key: "ETC", label: "기타", dot: "bg-slate-400" },
];

interface LeaveRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function LeaveRequestDialog({
  open,
  onClose,
  onCreated,
}: LeaveRequestDialogProps) {
  useEscapeKey(onClose, open);

  const [type, setType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: createLeave,
    onSuccess: () => onCreated(),
  });

  useEffect(() => {
    if (!open) return;
    setType("ANNUAL");
    setStartDate("");
    setEndDate("");
    setReason("");
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // 반차는 하루만.
  const effectiveEnd = type === "HALF" ? startDate : endDate;
  const canSubmit =
    !!startDate &&
    !!effectiveEnd &&
    effectiveEnd >= startDate &&
    !mutation.isPending;

  function submit() {
    if (!canSubmit) return;
    mutation.mutate({
      type,
      startDate,
      endDate: effectiveEnd,
      reason: reason.trim() || undefined,
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
        className="animate-dialog-in flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogGradientHeader
          kicker="NEW REQUEST"
          title="휴가 신청"
          onClose={onClose}
        />

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Field label="종류">
            <div className="grid grid-cols-5 gap-2">
              {TYPES.map((t) => {
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    className={`flex flex-col items-center gap-2 rounded-md border px-3 py-3 transition-colors ${
                      active
                        ? "border-primary bg-primary/15"
                        : "border-line hover:bg-card-hover"
                    }`}
                  >
                    <span className={`size-2 rounded-full ${t.dot}`} />
                    <span
                      className={`text-sm font-semibold ${
                        active ? "text-primary" : "text-fg"
                      }`}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="시작일">
              <DateInput value={startDate} onChange={setStartDate} />
            </Field>
            <Field
              label="종료일"
              hint={type === "HALF" ? "(반차는 하루)" : undefined}
            >
              <DateInput
                value={effectiveEnd}
                onChange={setEndDate}
                disabled={type === "HALF"}
              />
            </Field>
          </div>

          <Field label="사유" hint="(선택)">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="비워두어도 신청 가능"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

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
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "신청 중…" : "신청하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-fg">
        {label}
        {hint && <span className="ml-1 text-muted">{hint}</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DateInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2.5 focus-within:border-primary ${disabled ? "opacity-60" : ""}`}
    >
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent text-sm tabular-nums text-fg placeholder-muted focus:outline-none disabled:cursor-not-allowed"
      />
      <CalendarIcon className="size-4 shrink-0 text-muted" />
    </div>
  );
}
