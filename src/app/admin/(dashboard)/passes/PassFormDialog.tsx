"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/TextField";
import { NumberField } from "@/components/NumberField";
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
  // 이용 기간 (개월) — 선택. 일권·2주권 같은 예외는 비워두면 백엔드 NULL,
  // 프론트 정렬·일자 계산은 이름에서 자동 추출.
  const [durationMonths, setDurationMonths] = useState(
    initial?.duration_months != null ? String(initial.duration_months) : "",
  );
  // 무료 제공 토글:
  //  - 회원권/수강권: 락커·운동복 둘 다 노출 (둘 다 끼워줄 수 있음).
  //    수강권은 기본 둘 다 ON (PT 회원에게 락커·운동복 무료 지급이 관행).
  //  - 락커 패스: "운동복 무료 제공"만 (자기 자신 락커는 의미 없음).
  //  - 운동복 패스: "락커 무료 제공"만 (자기 자신 운동복은 의미 없음).
  //  예: 어드민이 "운동복 1개월 (락커 무료 지급)" 운동복 패스를 가격 +5,000원으로
  //     등록 → 회원이 선택 시 락커 자동 포함, 별도 락커 선택 차단.
  const ptDefault = type === "pt";
  const [providesLocker, setProvidesLocker] = useState(
    initial?.provides_locker ?? ptDefault,
  );
  const [providesClothes, setProvidesClothes] = useState(
    initial?.provides_clothes ?? ptDefault,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEscapeKey(onCancel, open);

  if (!open) return null;

  // 자기 자신은 끼워줄 수 없으므로 같은 종류 체크박스는 숨김.
  const showLockerCheckbox = type !== "locker";
  const showClothesCheckbox = type !== "clothes";
  const showProvides = showLockerCheckbox || showClothesCheckbox;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "상품명을 입력해 주세요.";
    if (cash === "" || Number.isNaN(Number(cash)) || Number(cash) < 0)
      errs.cash = "현금가를 정확히 입력해 주세요.";
    if (card === "" || Number.isNaN(Number(card)) || Number(card) < 0)
      errs.card = "카드가를 정확히 입력해 주세요.";
    // 이용 기간(개월) — PT 는 헬스권 40일 고정이라 항상 null. 그 외는 비어있으면 null,
    // 있으면 1~120 정수.
    if (type !== "pt" && durationMonths !== "") {
      const n = Number(durationMonths);
      if (!Number.isInteger(n) || n < 1 || n > 120) {
        errs.duration = "이용 기간은 1~120 개월 정수로 입력해 주세요.";
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const payload: PassInput = {
      name: name.trim(),
      cash_price: Number(cash),
      card_price: Number(card),
      duration_months:
        type === "pt"
          ? null
          : durationMonths === ""
            ? null
            : Number(durationMonths),
    };
    // 자기 자신 종류는 백엔드 스키마에 필드가 없으므로 누락시킴.
    if (showLockerCheckbox) payload.provides_locker = providesLocker;
    if (showClothesCheckbox) payload.provides_clothes = providesClothes;
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
            <NumberField
              id="pass-cash"
              label="현금가"
              required
              value={cash}
              onChange={(next) => setCash(next)}
              error={errors.cash}
            />
            <NumberField
              id="pass-card"
              label="카드가"
              required
              value={card}
              onChange={(next) => setCard(next)}
              error={errors.card}
            />
            {/* PT 수강권은 헬스권 40일 고정 — 폼에서 받지 않음 */}
            {type === "pt" ? (
              <div>
                <p className="text-sm/6 font-medium text-gray-900">이용 기간</p>
                <div className="mt-2 rounded-md bg-gray-100 px-3 py-2.5 text-base text-gray-600">
                  40일 (고정)
                </div>
                <p className="mt-1.5 text-sm text-gray-500">
                  PT 수강권은 헬스권 40일이 자동 제공돼요.
                </p>
              </div>
            ) : (
              <NumberField
                id="pass-duration"
                label="이용 기간"
                unit="개월"
                placeholder="예: 3"
                value={durationMonths}
                onChange={(next) => setDurationMonths(next)}
                error={errors.duration}
                hint="비워두면 신청서가 상품명에서 자동 추출해요 (예: '7일권', 'VIP 1년권')."
              />
            )}
            {showProvides && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  무료 제공
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  체크 시 신청자가 이 상품을 선택하면 해당 상품이 무료로 함께
                  제공돼요. 다른 상품 선택 UI는 자동으로 차단됩니다.
                </p>
                <div className="mt-3 space-y-2.5">
                  {showLockerCheckbox && (
                    <Checkbox
                      id="provides-locker"
                      label="락커 무료 제공"
                      checked={providesLocker}
                      onChange={(e) => setProvidesLocker(e.target.checked)}
                    />
                  )}
                  {showClothesCheckbox && (
                    <Checkbox
                      id="provides-clothes"
                      label="운동복 무료 제공"
                      checked={providesClothes}
                      onChange={(e) => setProvidesClothes(e.target.checked)}
                    />
                  )}
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
