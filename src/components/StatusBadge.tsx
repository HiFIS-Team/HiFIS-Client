// 회원·PT 상태 배지 — REGISTERED(유효) / EXPIRED(만료) / HELD(홀딩)
// 백엔드 hold 생성/취소 시 status 자동 전환됨 (Phase A 통합 완료).
export const STATUS_META: Record<string, { label: string; cls: string }> = {
  REGISTERED: { label: "유효", cls: "bg-green-100 text-green-700" },
  EXPIRED: { label: "만료", cls: "bg-gray-100 text-gray-600" },
  HELD: { label: "홀딩", cls: "bg-amber-100 text-amber-700" },
};

// 회원·PT 조회의 상태 필터 옵션 (전체 + 각 상태)
export const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "전체 상태" },
  { value: "REGISTERED", label: "유효" },
  { value: "EXPIRED", label: "만료" },
  { value: "HELD", label: "홀딩" },
];

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}
