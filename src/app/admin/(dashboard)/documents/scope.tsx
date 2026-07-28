// 문서함 공개 범위 — 새 폴더 / 문서 업로드 / 폴더 업로드 다이얼로그 공용.
// v2 백엔드 계약(backend-api.md §9) 은 scope 를 자유 문자열로 받아 그대로 저장.
// 프론트는 4개 프리셋으로 노출.

export type Scope = "all" | "team" | "personal" | "custom";

export interface ScopeOption {
  key: Scope;
  label: string;
}

export const SCOPE_OPTIONS: ScopeOption[] = [
  { key: "all", label: "전체 공개" },
  { key: "team", label: "팀 공개" },
  { key: "personal", label: "개인" },
  { key: "custom", label: "사용자지정" },
];

// 4개 pill 버튼. 첫 항목이 primary(selected), 나머지 outline.
export function ScopePicker({
  value,
  onChange,
  options,
}: {
  value: Scope;
  onChange: (v: Scope) => void;
  options: ScopeOption[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "border-primary bg-primary/25 text-primary"
                : "border-line text-fg hover:bg-card-hover"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
