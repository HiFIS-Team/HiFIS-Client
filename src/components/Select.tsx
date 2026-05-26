import type { ComponentType, SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  // 선택 전 안내 문구 — 주면 비활성 빈 옵션이 맨 위에 추가됨 (필수 항목용)
  placeholder?: string;
  // 라벨 왼쪽에 표시할 아이콘 (선택) — 필터 라벨 식별용
  icon?: ComponentType<{ className?: string }>;
}

// 라벨 + 드롭다운 한 묶음. Tailwind Plus 폼 스타일을 라이트 테마로 적용.
export function Select({
  label,
  options,
  error,
  placeholder,
  icon: Icon,
  id,
  required,
  value,
  className = "",
  ...rest
}: SelectProps) {
  const empty = value === "" || value === undefined;
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
      <div className="mt-2 grid grid-cols-1">
        <select
          id={id}
          required={required}
          value={value}
          aria-invalid={error ? true : undefined}
          className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2.5 pr-9 pl-3 text-base outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 ${
            error
              ? "outline-red-500 focus:outline-red-500"
              : "outline-gray-300 focus:outline-primary"
          } ${empty && placeholder ? "text-gray-400" : "text-gray-900"} ${className}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-gray-900">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2.5 size-5 self-center justify-self-end text-gray-500"
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
