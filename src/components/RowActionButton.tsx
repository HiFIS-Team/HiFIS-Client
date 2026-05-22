import type { ButtonHTMLAttributes } from "react";

interface RowActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // danger = 삭제·거부 등 (빨강), default = 수정·승인 등 (보라)
  variant?: "default" | "danger";
}

// 표 행의 액션 버튼 — 작은 블록형, hover 시 배경색이 약간 진해진다.
export function RowActionButton({
  variant = "default",
  className = "",
  type = "button",
  children,
  ...rest
}: RowActionButtonProps) {
  const tone =
    variant === "danger"
      ? "bg-red-50 text-red-600 hover:bg-red-100"
      : "bg-violet-50 text-primary hover:bg-violet-100";
  return (
    <button
      type={type}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${tone} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
