"use client";

import type { ComponentType } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/16/solid";

export interface SelectOption {
  value: string;
  label: string;
}

// 외부 API — 기존 <select> 시절과 호환되도록 onChange 는 {target:{value}} 형태로 호출.
// (기존 callsite `(e) => setX(e.target.value)` 전부 그대로 동작)
interface SelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  error?: string;
  // 선택 전 안내 문구 — 비어있을 때 버튼에 회색으로 표시
  placeholder?: string;
  // 라벨 왼쪽에 표시할 아이콘 (선택) — 필터 라벨 식별용
  icon?: ComponentType<{ className?: string }>;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Headless UI Listbox 기반 커스텀 드롭다운.
// 네이티브 <select> 의 OS별 다이얼로그(iOS 회전식·Android 시스템 시트) 대신,
// 모든 플랫폼에서 동일한 라이트 테마 패널을 띄운다.
export function Select({
  label,
  options,
  value,
  onChange,
  error,
  placeholder,
  icon: Icon,
  id,
  required,
  disabled,
  className = "",
}: SelectProps) {
  const selected = options.find((o) => o.value === value);
  const empty = value === "" || value === undefined || value === null;

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm/6 font-medium text-gray-900"
      >
        {Icon && <Icon className="size-4 text-gray-500" />}
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <Listbox
        value={value ?? ""}
        onChange={(v: string) => onChange({ target: { value: v } })}
        disabled={disabled}
      >
        <div className="relative mt-2">
          <ListboxButton
            id={id}
            aria-invalid={error ? true : undefined}
            className={`relative block w-full min-h-11 cursor-default rounded-md bg-white py-2.5 pr-10 pl-3 text-left text-base outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${
              error
                ? "outline-red-500 focus:outline-red-500"
                : "outline-gray-300 focus:outline-primary"
            } ${className}`}
          >
            <span
              className={`block truncate ${
                empty ? "text-gray-400" : "text-gray-900"
              }`}
            >
              {selected ? selected.label : placeholder ?? " "}
            </span>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-500"
            />
          </ListboxButton>

          <ListboxOptions
            anchor={{ to: "bottom start", gap: 4 }}
            transition
            className="z-40 w-[var(--button-width)] max-h-72 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/10 focus:outline-none data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:opacity-0"
          >
            {options.map((o) => (
              <ListboxOption
                key={o.value}
                value={o.value}
                className="group relative flex cursor-default items-center gap-2 py-2.5 pr-9 pl-3 text-base text-gray-900 select-none data-[focus]:bg-primary data-[focus]:text-white"
              >
                <span className="block truncate group-data-[selected]:font-semibold">
                  {o.label}
                </span>
                <CheckIcon
                  aria-hidden="true"
                  className="invisible absolute right-3 size-5 text-primary group-data-[selected]:visible group-data-[focus]:text-white"
                />
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
