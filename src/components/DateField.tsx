"use client";

import { useState } from "react";
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
// picker 자체는 브라우저 기본 사용 (icon 영역 탭 시에만 노출 — 의도된 동작).
//
// 구현: 투명한 <input type="date"> 를 달력 아이콘 위에 겹쳐서 탭이 직접 input 으로
// 들어가게 한다. (showPicker() 는 모바일에서 hidden input 일 때 작동 안 함 — iOS Safari·Chrome Android)
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

  function handleTextChange(input: string) {
    const masked = mask(input);
    setText(masked);
    // 완성된 YYYY-MM-DD 또는 빈 값일 때만 부모 상태 갱신.
    // (부분 입력 중에는 부모 미반영 → 자동 계산 로직이 NaN 만나지 않게)
    if (masked === "" || COMPLETE.test(masked)) {
      onChange({ target: { value: masked } });
    }
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
          placeholder="YYYY-MM-DD"
          maxLength={10}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`block min-h-11 w-full appearance-none rounded-md bg-white py-2.5 pr-11 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:bg-card-hover dark:text-fg dark:placeholder:text-muted dark:disabled:bg-card dark:disabled:text-muted ${
            error
              ? "outline-red-500 focus:outline-red-500"
              : "outline-gray-300 focus:outline-primary dark:outline-line"
          }`}
        />
        {/* 달력 아이콘 영역 — 우상단 28×28.
            투명한 <input type="date"> 가 같은 영역에 겹쳐있어 탭하면 native picker 가 뜬다.
            (PC·iOS Safari·Chrome Android 공통 — showPicker() 미사용) */}
        <div className="group absolute top-1/2 right-2 size-7 -translate-y-1/2">
          <input
            type="date"
            aria-label="달력으로 선택"
            tabIndex={-1}
            min={min}
            max={max}
            disabled={disabled}
            value={COMPLETE.test(text) ? text : ""}
            onChange={(e) => {
              setText(e.target.value);
              onChange({ target: { value: e.target.value } });
            }}
            className="absolute inset-0 cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none flex size-7 items-center justify-center rounded text-gray-500 group-hover:bg-gray-100 group-hover:text-gray-700 group-has-[input:disabled]:opacity-50 dark:text-muted dark:group-hover:bg-line dark:group-hover:text-fg"
          >
            <CalendarIcon className="size-5" />
          </div>
        </div>
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
