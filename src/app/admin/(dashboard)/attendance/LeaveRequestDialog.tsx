"use client";

import { useState } from "react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 휴가 신청 모달 — UI 만. 저장 로직은 API 붙는 시점에.
// 헤더는 DialogGradientHeader 공용 (일정 추가와 동일 톤).

interface LeaveType {
  key: string;
  label: string;
  dot: string; // tailwind bg 클래스
}
const TYPES: LeaveType[] = [
  { key: "annual", label: "연차", dot: "bg-primary" },
  { key: "half", label: "반차", dot: "bg-violet-400" },
  { key: "sick", label: "병가", dot: "bg-red-400" },
  { key: "field", label: "외근", dot: "bg-emerald-400" },
  { key: "etc", label: "기타", dot: "bg-slate-400" },
];

interface LeaveRequestDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LeaveRequestDialog({ open, onClose }: LeaveRequestDialogProps) {
  useEscapeKey(onClose, open);

  const [type, setType] = useState<string>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  if (!open) return null;

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
          {/* 종류 — 5개 큰 chip (dot + 라벨) */}
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

          {/* 시작일 / 종료일 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="시작일">
              <DateInput
                value={startDate}
                onChange={setStartDate}
                placeholder="YYYY-MM-DD"
              />
            </Field>
            <Field label="종료일">
              <DateInput
                value={endDate}
                onChange={setEndDate}
                placeholder="YYYY-MM-DD"
              />
            </Field>
          </div>

          {/* 사유 */}
          <Field label="사유" hint="(선택)">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="비워두어도 신청 가능"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            신청하기
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
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2.5 focus-within:border-primary">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm tabular-nums text-fg placeholder-muted focus:outline-none"
      />
      <CalendarIcon className="size-4 shrink-0 text-muted" />
    </div>
  );
}
