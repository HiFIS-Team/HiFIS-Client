import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // 로딩 중이면 비활성 처리 + 문구 대체
  loading?: boolean;
}

// 기본 버튼 — 강조색(primary) 채움.
// 폭은 호출 측에서 className 으로 지정 (예: "w-full").
export function Button({
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`rounded-md bg-primary px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}
    >
      {loading ? "처리 중…" : children}
    </button>
  );
}
