import type { ButtonHTMLAttributes } from "react";

interface RowActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // default = 수정·승인 등 (보라), danger = 삭제·거부 (빨강), neutral = 보기 등 (회색)
  variant?: "default" | "danger" | "neutral";
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
      ? "border border-red-500 bg-red-500/15 text-red-300 hover:bg-red-500/25"
      : variant === "neutral"
        ? "border border-line bg-card-hover text-fg hover:bg-line"
        : "border border-primary bg-primary/15 text-primary hover:bg-primary/25";
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
