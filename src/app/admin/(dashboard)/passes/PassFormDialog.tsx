"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/TextField";
import type { PassInput } from "@/lib/api/passes";

interface PassFormDialogProps {
  open: boolean;
  title: string;
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

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
    onSubmit({
      name: name.trim(),
      cash_price: Number(cash),
      card_price: Number(card),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
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
          <div className="flex justify-end gap-2 pt-2">
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
