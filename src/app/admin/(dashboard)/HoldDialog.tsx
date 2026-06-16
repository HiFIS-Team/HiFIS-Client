"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { createHold } from "@/lib/api/holds";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { DateField } from "@/components/DateField";
import { Textarea } from "@/components/Textarea";
import { formatPhone } from "@/lib/format";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// 회원·PT 신청의 이용 기간을 일시 정지(홀딩)하는 모달.
// 목록 행의 [홀딩] 버튼에서 대상이 정해진 채로 열린다 — 대상은 따로 고르지 않는다.
export function HoldDialog({
  sourceType,
  sourceId,
  name,
  phone,
  onClose,
  onSuccess,
}: {
  sourceType: "MEMBER" | "PT_APPLICATION";
  sourceId: string;
  name: string;
  phone: string;
  onClose: () => void;
  // 등록 성공 시 — 목록 갱신 등 부모 후처리
  onSuccess?: () => void;
}) {
  const toast = useToast();
  useEscapeKey(onClose);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      createHold({
        source_type: sourceType,
        source_id: sourceId,
        reason: reason.trim(),
        start_date: startDate,
        end_date: endDate,
      }),
    onSuccess: () => {
      toast.success(`${name}님의 홀딩이 등록되었습니다.`);
      onSuccess?.();
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!startDate) e.startDate = "홀딩 시작일을 선택해 주세요.";
    if (!endDate) e.endDate = "홀딩 종료일을 선택해 주세요.";
    else if (startDate && endDate < startDate)
      e.endDate = "종료일은 시작일보다 빠를 수 없습니다.";
    if (!reason.trim()) e.reason = "홀딩 사유를 입력해 주세요.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    mutation.mutate();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-md flex-col rounded-xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-line px-6 py-4 text-lg font-bold text-fg">
          홀딩 등록
        </h2>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col"
          noValidate
        >
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            {/* 대상 — 행에서 선택된 회원/신청자로 고정 */}
            <div className="rounded-lg bg-card-hover px-4 py-3">
              <p className="text-xs text-muted">대상</p>
              <p className="mt-0.5 text-sm font-semibold text-fg">
                {name}
                <span className="ml-2 font-normal text-muted">
                  {formatPhone(phone)}
                </span>
              </p>
            </div>
            <DateField
              id="hold-start"
              label="홀딩 시작일"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={errors.startDate}
            />
            <DateField
              id="hold-end"
              label="홀딩 종료일"
              required
              min={startDate || undefined}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={errors.endDate}
            />
            <Textarea
              id="hold-reason"
              label="홀딩 사유"
              required
              maxLength={500}
              placeholder="예: 해외 출장, 부상 등"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={errors.reason}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-semibold text-muted hover:bg-card-hover hover:text-fg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md border border-primary bg-primary/15 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/25 disabled:opacity-60"
            >
              {mutation.isPending ? "처리 중…" : "홀딩 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
