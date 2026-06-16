import type { InputHTMLAttributes, ReactNode } from "react";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

// 체크박스 + 라벨. 동의 항목 등에 사용.
export function Checkbox({
  label,
  error,
  id,
  className = "",
  ...rest
}: CheckboxProps) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className={`mt-0.5 size-5 shrink-0 accent-primary ${className}`}
          {...rest}
        />
        <span className="text-base text-gray-900 dark:text-fg">{label}</span>
      </label>
      {error && (
        <p className="mt-1.5 ml-8 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
