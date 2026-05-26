import type { ComponentType, ReactNode } from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";

// 관리자 표 공용 요소.

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium whitespace-nowrap">{children}</th>;
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 whitespace-nowrap ${className}`}>{children}</td>
  );
}

// 표 자리의 로딩·에러·빈 목록 메시지 — variant 로 아이콘·톤 분기.
type TableMessageVariant = "loading" | "error" | "empty";

const VARIANT_META: Record<
  TableMessageVariant,
  {
    icon: ComponentType<{ className?: string }>;
    iconClass: string;
    bgClass: string;
  }
> = {
  loading: {
    icon: ArrowPathIcon,
    iconClass: "text-gray-400 animate-spin",
    bgClass: "bg-gray-100",
  },
  error: {
    icon: ExclamationTriangleIcon,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-50",
  },
  empty: {
    icon: InboxIcon,
    iconClass: "text-gray-400",
    bgClass: "bg-gray-100",
  },
};

export function TableMessage({
  children,
  variant = "empty",
}: {
  children: ReactNode;
  variant?: TableMessageVariant;
}) {
  const v = VARIANT_META[variant];
  const Icon = v.icon;
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
      <div
        className={`mb-3 flex size-12 items-center justify-center rounded-full ${v.bgClass}`}
      >
        <Icon className={`size-6 ${v.iconClass}`} />
      </div>
      <p>{children}</p>
    </div>
  );
}
