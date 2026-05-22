import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  // 검증 에러 메시지 — 있으면 빨간 테두리 + 메시지 표시
  error?: string;
  // 보조 설명 — 에러가 없을 때 회색으로 표시
  hint?: string;
}

// 라벨 + 인풋 한 묶음. Tailwind Plus 폼 스타일을 라이트 테마로 적용.
export function TextField({
  label,
  error,
  hint,
  id,
  required,
  className = "",
  ...rest
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="mt-2">
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          className={`block w-full rounded-md bg-white px-3 py-2.5 text-base text-gray-900 outline-1 -outline-offset-1 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 ${
            error
              ? "outline-red-500 focus:outline-red-500"
              : "outline-gray-300 focus:outline-primary"
          } ${className}`}
          {...rest}
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
