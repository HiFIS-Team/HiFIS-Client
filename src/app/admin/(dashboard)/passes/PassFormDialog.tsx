"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/TextField";
import { Checkbox } from "@/components/Checkbox";
import type { PassInput, PassType } from "@/lib/api/passes";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

interface PassFormDialogProps {
  open: boolean;
  title: string;
  // 회원권/수강권일 때만 락커·운동복 무료 제공 옵션 노출
  type: PassType;
  // 수정 시 기존 값, 등록 시 null
  initial?: PassInput | null;
  loading?: boolean;
  onSubmit: (values: PassInput) => void;
  onCancel: () => void;
}

// 상품 등록·수정 폼 모달.
// 부모가 열 때마다 key 를 바꿔 새 상태로 마운트한다.
export function PassFormDialog({
  open,
  title,
  type,
  initial,
  loading = false,
  onSubmit,
  onCancel,
}: PassFormDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cash, setCash] = useState(
    initial ? String(initial.cash_price) : "",
  );
  const [card, setCard] = useState(
    initial ? String(initial.card_price) : "",
  );
  // 회원권·수강권 전용 — 락커·운동복 무료 제공 토글
  const [providesLocker, setProvidesLocker] = useState(
    initial?.provides_locker ?? false,
  );
  const [providesClothes, setProvidesClothes] = useState(
    initial?.provides_clothes ?? false,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEscapeKey(onCancel, open);

  if (!open) return null;

  const showProvides = type === "membership" || type === "pt";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "상품명을 입력해 주세요.";
    if (cash === "" || Number.isNaN(Number(cash)) || Number(cash) < 0)
      errs.cash = "현금가를 정확히 입력해 주세요.";
    if (card === "" || Number.isNaN(Number(card)) || Number(card) < 0)
      errs.card = "카드가를 정확히 입력해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const payload: PassInput = {
      name: name.trim(),
      cash_price: Number(cash),
      card_price: Number(card),
    };
    // 회원권·수강권에만 provides_* 포함 — 락커·운동복엔 서버 스키마에 없는 필드라 누락시켜야 함
    if (showProvides) {
      payload.provides_locker = providesLocker;
      payload.provides_clothes = providesClothes;
    }
    onSubmit(payload);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onCancel}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-200 px-6 py-4 text-lg font-bold text-gray-900">
          {title}
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col"
          noValidate
        >
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <TextField
              id="pass-name"
              label="상품명"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <TextField
              id="pass-cash"
              label="현금가 (원)"
              required
              type="number"
              inputMode="numeric"
              min={0}
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              error={errors.cash}
            />
            <TextField
              id="pass-card"
              label="카드가 (원)"
              required
              type="number"
              inputMode="numeric"
              min={0}
              value={card}
              onChange={(e) => setCard(e.target.value)}
              error={errors.card}
            />
            {showProvides && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  무료 제공
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  체크 시 신청자는 별도 락커·운동복 상품을 선택할 수 없고
                  자동 포함됩니다.
                </p>
                <div className="mt-3 space-y-2.5">
                  <Checkbox
                    id="provides-locker"
                    label="락커 무료 제공"
                    checked={providesLocker}
                    onChange={(e) => setProvidesLocker(e.target.checked)}
                  />
                  <Checkbox
                    id="provides-clothes"
                    label="운동복 무료 제공"
                    checked={providesClothes}
                    onChange={(e) => setProvidesClothes(e.target.checked)}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "처리 중…" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
