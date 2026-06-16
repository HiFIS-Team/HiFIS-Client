"use client";

import { SparklesIcon } from "@heroicons/react/24/solid";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import type {
  ReleaseNote,
  ReleaseNoteItem,
  ReleaseNoteType,
} from "@/lib/releaseNotes";

// 새 버전 배포 후 어드민 첫 진입 시 띄우는 변경사항 안내 모달.
// notes 는 lastSeen 보다 큰 버전들 (최신순). 같은 카드 안에 v1.2.0 → v1.1.0 식으로 누적 노출.

// 종류별 칩 메타 — 새 기능 / 개선 / 버그 수정.
const TYPE_META: Record<
  ReleaseNoteType,
  { label: string; chipClass: string; dotClass: string }
> = {
  feature: {
    label: "새 기능",
    chipClass: "bg-primary/15 text-primary",
    dotClass: "bg-primary",
  },
  improvement: {
    label: "개선",
    chipClass: "bg-sky-500/15 text-sky-300",
    dotClass: "bg-sky-400",
  },
  fix: {
    label: "버그 수정",
    chipClass: "bg-amber-500/15 text-amber-300",
    dotClass: "bg-amber-400",
  },
};

export function ReleaseNotesDialog({
  notes,
  onClose,
}: {
  notes: ReleaseNote[];
  onClose: () => void;
}) {
  useEscapeKey(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col rounded-xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — Sparkles 아이콘 칩 + 제목 (닫기 X 는 푸터 "확인" 으로 대체) */}
        <div className="flex items-start gap-3 border-b border-line px-6 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <SparklesIcon className="size-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-fg">
              새 업데이트가 적용됐어요
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              최근 변경 사항을 확인해 주세요.
            </p>
          </div>
        </div>

        {/* 본문 — 버전별 섹션 (최신부터). 각 버전 안에서 종류(feature/improvement) 별로 그룹. */}
        <div className="space-y-7 overflow-y-auto px-6 py-6">
          {notes.map((note) => (
            <VersionSection key={note.version} note={note} />
          ))}
        </div>

        <div className="flex justify-end border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-primary bg-primary/15 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/25"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// 버전 한 개 — 헤더(버전·날짜) + 종류별 그룹 (feature → improvement → fix 순).
function VersionSection({ note }: { note: ReleaseNote }) {
  const grouped: Record<ReleaseNoteType, ReleaseNoteItem[]> = {
    feature: note.items.filter((i) => i.type === "feature"),
    improvement: note.items.filter((i) => i.type === "improvement"),
    fix: note.items.filter((i) => i.type === "fix"),
  };
  return (
    <section>
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-bold text-fg">v{note.version}</h3>
        <span className="text-xs text-muted">{note.date}</span>
      </div>
      <div className="mt-4 space-y-5">
        <CategoryGroup type="feature" items={grouped.feature} />
        <CategoryGroup type="improvement" items={grouped.improvement} />
        <CategoryGroup type="fix" items={grouped.fix} />
      </div>
    </section>
  );
}

// 한 종류(feature 또는 improvement) 의 항목 묶음 — 색 칩 + 제목/설명 리스트.
function CategoryGroup({
  type,
  items,
}: {
  type: ReleaseNoteType;
  items: ReleaseNoteItem[];
}) {
  if (items.length === 0) return null;
  const meta = TYPE_META[type];
  return (
    <div>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.chipClass}`}
      >
        {meta.label}
      </span>
      <ul className="mt-3 space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden="true"
              className={`mt-2 inline-block size-1.5 shrink-0 rounded-full ${meta.dotClass}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">
                {item.title}
              </p>
              <div className="mt-1 space-y-1.5">
                {item.description.map((para, j) => (
                  <p key={j} className="text-sm/6 text-muted">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
