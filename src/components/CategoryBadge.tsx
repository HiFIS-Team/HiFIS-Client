// 회원·PT 신청 경로 구분 배지 — NEW(신규: 회원가입/PT 신청서)
// vs EXISTING(기존: 재등록 endpoint 거친 사람).
// 같은 톤의 작은 pill 형태 (StatusBadge 와 디자인 통일).
export const CATEGORY_META: Record<string, { label: string; cls: string }> = {
  NEW: { label: "신규", cls: "bg-primary/15 text-violet-300" },
  EXISTING: { label: "기존", cls: "bg-blue-500/15 text-blue-300" },
};

// 회원·PT 조회의 구분 필터 옵션 (전체 + 신규/기존)
export const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "전체 구분" },
  { value: "NEW", label: "신규" },
  { value: "EXISTING", label: "기존" },
];

export function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? {
    label: category,
    cls: "bg-card-hover text-muted",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}
