// 회원·PT 신청 경로 구분 배지 — NEW(신규: 회원가입/PT 신청서)
// vs EXISTING(기존: 재등록 endpoint 거친 사람).
// 같은 톤의 작은 pill 형태 (StatusBadge 와 디자인 통일).
export const CATEGORY_META: Record<string, { label: string; cls: string }> = {
  NEW: { label: "신규", cls: "bg-violet-100 text-violet-700" },
  EXISTING: { label: "기존", cls: "bg-blue-100 text-blue-700" },
};

export function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? {
    label: category,
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
