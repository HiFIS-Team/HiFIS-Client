"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/TextField";
import { NumberField } from "@/components/NumberField";
import { Checkbox } from "@/components/Checkbox";
import type { PassInput, PassType } from "@/lib/api/passes";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// 이용 기간 단위 — 한 상품은 셋 중 하나만 가짐.
type DurationUnit = "months" | "days" | "hours";

// 단위별 표시 라벨·placeholder·검증 범위·hint.
const UNIT_META: Record<
  DurationUnit,
  { label: string; placeholder: string; max: number; hint: string }
> = {
  months: {
    label: "개월",
    placeholder: "예: 1, 3, 6",
    max: 120,
    hint: "비워두면 신청서가 상품명에서 자동 추출해요. (예: '1개월권', '1년권')",
  },
  days: {
    label: "일",
    placeholder: "예: 1, 7, 14",
    max: 365,
    hint: "비워두면 상품명에서 자동 추출해요. (예: '7일권', '2주권')",
  },
  hours: {
    label: "시간",
    placeholder: "예: 3",
    max: 23,
    hint: "당일 만료 (예: '3시간권'). 1~23 시간만.",
  },
};

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
  // 이용 기간 — 단위(개월/일/시간) + 값 한 필드.
  // 초기값: initial 의 채워진 컬럼 우선, 모두 비어있으면 type 별 기본 단위(PT/락커/운동복은 "일" 이 흔함, 회원권은 "개월").
  // 비워두면 백엔드 NULL → 프론트 정렬·일자 계산은 이름에서 자동 추출.
  const initialUnit: DurationUnit =
    initial?.duration_hours != null
      ? "hours"
      : initial?.duration_days != null
        ? "days"
        : initial?.duration_months != null
          ? "months"
          : type === "membership"
            ? "months"
            : "days";
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialUnit);
  const [durationValue, setDurationValue] = useState(
    initial?.duration_hours != null
      ? String(initial.duration_hours)
      : initial?.duration_days != null
        ? String(initial.duration_days)
        : initial?.duration_months != null
          ? String(initial.duration_months)
          : "",
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
  const unitMeta = UNIT_META[durationUnit];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "상품명을 입력해 주세요.";
    if (cash === "" || Number.isNaN(Number(cash)) || Number(cash) < 0)
      errs.cash = "현금가를 정확히 입력해 주세요.";
    if (card === "" || Number.isNaN(Number(card)) || Number(card) < 0)
      errs.card = "카드가를 정확히 입력해 주세요.";
    // 이용 기간 — 비어있으면 null, 있으면 1~{max} 정수 (단위별 검증).
    if (durationValue !== "") {
      const n = Number(durationValue);
      if (!Number.isInteger(n) || n < 1 || n > unitMeta.max) {
        errs.duration = `이용 기간은 1~${unitMeta.max} ${unitMeta.label} 정수로 입력해 주세요.`;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    // 선택된 단위에만 값 박고 나머지는 null — 백엔드 cross-field 검증 통과 보장.
    const num = durationValue === "" ? null : Number(durationValue);
    const payload: PassInput = {
      name: name.trim(),
      cash_price: Number(cash),
      card_price: Number(card),
      duration_months: durationUnit === "months" ? num : null,
      duration_days: durationUnit === "days" ? num : null,
      duration_hours: durationUnit === "hours" ? num : null,
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
            {/* 이용 기간 — 단위 토글(개월/일/시간) + 값 한 필드.
                단위 바꿔도 입력값은 유지 (검증 시 단위에 맞춰 max 적용). */}
            <div>
              <label className="flex items-center gap-1 text-sm/6 font-medium text-fg">
                이용 기간
              </label>
              <div className="mt-2 flex gap-1.5 rounded-md bg-card-hover p-1">
                {(["months", "days", "hours"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDurationUnit(u)}
                    className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      durationUnit === u
                        ? "bg-card text-primary shadow-sm ring-1 ring-line"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    {UNIT_META[u].label}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <NumberField
                  id="pass-duration"
                  label=""
                  unit={unitMeta.label}
                  placeholder={unitMeta.placeholder}
                  value={durationValue}
                  onChange={(next) => setDurationValue(next)}
                  error={errors.duration}
                  hint={unitMeta.hint}
                />
              </div>
            </div>
            {showProvides && (
              <div className="rounded-lg border border-line bg-card-hover px-4 py-3">
                <p className="text-sm font-semibold text-fg">
                  무료 제공
                </p>
                <p className="mt-0.5 text-xs text-muted">
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
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm font-semibold text-muted hover:bg-card-hover hover:text-fg"
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
