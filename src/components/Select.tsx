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
  // 라벨 아래 회색 작은 글씨로 표시되는 보조 라벨 (예: "현금 720,000원 / 카드 720,000원").
  // 옵션 list 에서만 노출 — button (선택된 값 표시) 은 깔끔하게 한 줄 유지.
  description?: string;
  // 라벨 우측에 회색으로 작게 표시되는 부가 정보 (예: "락커, 운동복 무료 제공")
  meta?: string;
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
            {/* button 은 항상 한 줄: label + (있으면) meta 우측. description 은 옵션 list 에서만. */}
            <span
              className={`flex min-w-0 items-center gap-2 ${
                empty ? "text-gray-400" : "text-gray-900"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                {selected ? selected.label : placeholder ?? " "}
              </span>
              {selected?.meta && (
                <span className="shrink-0 text-xs text-gray-500">
                  {selected.meta}
                </span>
              )}
            </span>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-500"
            />
          </ListboxButton>

          <ListboxOptions
            // 항상 버튼 아래로 고정 — Headless UI 의 anchor(Floating UI flip) 을 끄고
            // CSS absolute 로 위치 잡음. anchor 가 viewport 끝에서 위로 뒤집어 잡힌
            // 채 사용자가 누르는 사이 다시 아래로 점프해 탭 미스나는 문제 해결.
            // 패널 height: 모바일 max-h-44(176px ≈ 4-5항목), sm+ max-h-56(224px).
            anchor={false}
            // modal=false — 기본값(true) 이면 Listbox 열릴 때 body scroll lock 이 걸려서
            // 폼 스크롤이 멈춤. 드롭다운은 모달이 아니라 인라인 위젯이라 lock 불필요.
            modal={false}
            transition
            className="absolute top-full left-0 z-[60] mt-1 w-full max-h-44 sm:max-h-56 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/10 focus:outline-none data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:opacity-0"
          >
            {options.map((o) => (
              <ListboxOption
                key={o.value}
                value={o.value}
                className="group relative flex cursor-default items-start gap-2 py-2.5 pr-9 pl-3 text-base text-gray-900 select-none data-[focus]:bg-primary data-[focus]:text-white"
              >
                {/* label 메인 + description 작은 글씨로 아래 (있을 때) + meta 우측 회색 */}
                <span className="min-w-0 flex-1">
                  <span className="block truncate group-data-[selected]:font-semibold">
                    {o.label}
                  </span>
                  {o.description && (
                    <span className="block truncate text-xs text-gray-500 group-data-[focus]:text-white/80">
                      {o.description}
                    </span>
                  )}
                </span>
                {o.meta && (
                  <span className="mt-0.5 shrink-0 text-xs text-gray-500 group-data-[focus]:text-white/80">
                    {o.meta}
                  </span>
                )}
                <CheckIcon
                  aria-hidden="true"
                  className="invisible absolute right-3 top-3 size-5 text-primary group-data-[selected]:visible group-data-[focus]:text-white"
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
