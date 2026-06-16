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
    iconClass: "text-muted animate-spin",
    bgClass: "bg-card-hover",
  },
  error: {
    icon: ExclamationTriangleIcon,
    iconClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  empty: {
    icon: InboxIcon,
    iconClass: "text-muted",
    bgClass: "bg-card-hover",
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-card px-4 py-12 text-center text-sm text-muted">
      <div
        className={`mb-3 flex size-12 items-center justify-center rounded-full ${v.bgClass}`}
      >
        <Icon className={`size-6 ${v.iconClass}`} />
      </div>
      <p>{children}</p>
    </div>
  );
}

// 표 로딩 자리에 빈 펄스 바 — 데이터 모양만 미리 보여주는 placeholder.
// rows 만큼 가로 막대를 쌓는다 (열 구분 없이 가벼운 형태).
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="h-3 w-24 animate-pulse rounded bg-card-hover" />
            <div className="h-3 w-32 animate-pulse rounded bg-card-hover" />
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-card-hover" />
          </li>
        ))}
      </ul>
    </div>
  );
}
