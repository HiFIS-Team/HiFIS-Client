import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

// 라벨 + 여러 줄 입력. TextField 와 같은 스타일.
export function Textarea({
  label,
  error,
  id,
  required,
  rows = 3,
  className = "",
  ...rest
}: TextareaProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm/6 font-medium text-gray-900 dark:text-fg"
      >
        {label}
        {required && <span className="text-red-500 dark:text-red-400"> *</span>}
      </label>
      <div className="mt-2">
        <textarea
          id={id}
          required={required}
          rows={rows}
          aria-invalid={error ? true : undefined}
          className={`block w-full rounded-md bg-white px-3 py-2.5 text-base text-gray-900 outline-1 -outline-offset-1 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 dark:bg-card-hover dark:text-fg dark:placeholder:text-muted ${
            error
              ? "outline-red-500 focus:outline-red-500"
              : "outline-gray-300 focus:outline-primary dark:outline-line"
          } ${className}`}
          {...rest}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
