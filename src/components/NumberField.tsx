"use client";

import type { ReactNode } from "react";

interface NumberFieldProps {
  id?: string;
  label: string;
  // 부모는 콤마 없는 숫자 문자열로 받음 ("" / "0" / "10000"). 표시는 자동 콤마.
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  required?: boolean;
  // 검증 — 입력 시점에 막진 않고 부모가 submit 단계에서 처리. props 만 표시용으로 받음.
  error?: string;
  hint?: ReactNode;
  // 우측 회색 단위 표시 (예: "원")
  unit?: string;
  className?: string;
}

// 금액 입력 — 천 단위 콤마 자동 표시 (입력 중에도). 부모 state 엔 콤마 없는
// 숫자 문자열로 저장. type=text + inputMode=numeric 라 모바일에서 숫자 키패드.
export function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  hint,
  unit = "원",
  className = "",
}: NumberFieldProps) {
  const display = value === "" ? "" : Number(value).toLocaleString();

  function handleChange(raw: string) {
    // 콤마·공백·문자 모두 제거 — 숫자만 남김 (금액은 양수)
    const cleaned = raw.replace(/[^0-9]/g, "");
    onChange(cleaned);
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm/6 font-medium text-gray-900 dark:text-fg"
      >
        {label}
        {required && <span className="text-red-500 dark:text-red-400"> *</span>}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          className={`block min-h-11 w-full appearance-none rounded-md bg-white px-3 py-2.5 ${
            unit ? "pr-9" : ""
          } text-base tabular-nums text-gray-900 outline-1 -outline-offset-1 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 dark:bg-card-hover dark:text-fg dark:placeholder:text-muted ${
            error
              ? "outline-red-500 focus:outline-red-500"
              : "outline-gray-300 focus:outline-primary dark:outline-line"
          } ${className}`}
        />
        {unit && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-gray-500 dark:text-muted"
          >
            {unit}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
