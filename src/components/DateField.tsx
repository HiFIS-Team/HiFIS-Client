"use client";

import { useRef, useState } from "react";
import { CalendarIcon } from "@heroicons/react/24/outline";

interface DateFieldProps {
  label: string;
  // YYYY-MM-DD 또는 빈 문자열
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  error?: string;
  // 보조 설명 — 에러가 없을 때 회색으로 표시
  hint?: string;
  required?: boolean;
  id?: string;
  // YYYY-MM-DD — 달력 picker 의 선택 가능 범위 제한 (생년월일은 max=today 등)
  min?: string;
  max?: string;
  disabled?: boolean;
}

const COMPLETE = /^\d{4}-\d{2}-\d{2}$/;

// 숫자만 추출해 YYYYMMDD → YYYY-MM-DD 마스크로 변환
function mask(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

// 날짜 입력 — 키보드로 숫자 입력(자동 YYYY-MM-DD 포맷) + 우측 달력 아이콘으로 picker 호출.
// 네이티브 <input type="date"> 가 탭만 해도 picker 가 떠 모바일에서 불편한 문제 해결.
// picker 자체는 브라우저 기본 사용 (icon 명시 클릭 시에만 노출 — 의도된 동작).
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  id,
  min,
  max,
  disabled,
}: DateFieldProps) {
  // 내부 표시용 텍스트 — 사용자가 입력 중인 raw 문자열(마스크 적용 후).
  // 부모 value 가 외부에서 바뀌면 동기화 (picker 선택, 자동 계산된 end_date 등).
  // useEffect 대신 prop 변경 감지 패턴 — React 19 권장.
  const [text, setText] = useState(value ?? "");
  const [prevValue, setPrevValue] = useState(value ?? "");
  if ((value ?? "") !== prevValue) {
    setPrevValue(value ?? "");
    setText(value ?? "");
  }

  // 숨겨진 date 인풋 — 달력 picker 호출용
  const pickerRef = useRef<HTMLInputElement>(null);

  function handleTextChange(input: string) {
    const masked = mask(input);
    setText(masked);
    // 완성된 YYYY-MM-DD 또는 빈 값일 때만 부모 상태 갱신.
    // (부분 입력 중에는 부모 미반영 → 자동 계산 로직이 NaN 만나지 않게)
    if (masked === "" || COMPLETE.test(masked)) {
      onChange({ target: { value: masked } });
    }
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el) return;
    // 최신 브라우저 (Chrome 99+ / Safari 16+ / Firefox 101+)
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // user gesture 이슈 등 — 폴백
      }
    }
    el.focus();
    el.click();
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm/6 font-medium text-gray-900"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          maxLength={10}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`block min-h-11 w-full appearance-none rounded-md bg-white py-2.5 pr-11 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${
            error
              ? "outline-red-500 focus:outline-red-500"
              : "outline-gray-300 focus:outline-primary"
          }`}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          aria-label="달력으로 선택"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon className="size-5" />
        </button>
        {/* 달력 picker — 보이지 않지만 showPicker() 호출 대상.
            offscreen 위치 + 인터랙션 차단으로 입력 흐름은 방해하지 않음. */}
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          min={min}
          max={max}
          value={COMPLETE.test(text) ? text : ""}
          onChange={(e) => {
            setText(e.target.value);
            onChange({ target: { value: e.target.value } });
          }}
          className="pointer-events-none absolute right-2 bottom-0 size-0 opacity-0"
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
