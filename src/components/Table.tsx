import type { ReactNode } from "react";

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

// 표 자리의 로딩·에러·빈 목록 메시지
export function TableMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-16 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}
