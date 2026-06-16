"use client";

import { useState } from "react";
import { PageTitle } from "../PageTitle";
import {
  RELEASE_NOTES,
  semverCompare,
  type ReleaseNote,
} from "@/lib/releaseNotes";
import { ReleaseNotesDialog } from "@/components/ReleaseNotesDialog";

// 패치 노트 화면의 실제 내용 — MobileSubPage wrapper 와 분리.
// 라우트(/admin/release-notes) 와 프로필 인라인 패널 양쪽에서 사용.
export function ReleaseNotesContent() {
  // 최신 버전이 위로
  const sorted: ReleaseNote[] = [...RELEASE_NOTES].sort((a, b) =>
    semverCompare(b.version, a.version),
  );
  const [openVersion, setOpenVersion] = useState<string | null>(null);
  const openNote = openVersion
    ? sorted.find((n) => n.version === openVersion)
    : null;

  return (
    <>
      <PageTitle title="패치 노트" />
      <p className="hidden">버전별 업데이트 내역을 다시 볼 수 있어요.</p>

      {sorted.length === 0 ? (
        <p className="mt-6 text-sm text-muted">등록된 노트가 없습니다.</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {sorted.map((n) => {
            // 카드 미리보기 — 항목 제목 2개까지 노출, 더 있으면 "외 N건"
            const previewTitles = n.items.slice(0, 2).map((it) => it.title);
            const rest = n.items.length - previewTitles.length;
            return (
              <button
                key={n.version}
                type="button"
                onClick={() => setOpenVersion(n.version)}
                className="rounded-xl border border-line bg-card p-5 text-left transition-all hover:bg-card-hover active:scale-[0.99]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-fg">
                    v{n.version}
                  </h2>
                  <span className="shrink-0 text-xs text-muted">
                    {n.date}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {previewTitles.join(" · ")}
                  {rest > 0 && ` 외 ${rest}건`}
                </p>
                <p className="mt-3 text-xs font-medium text-primary">
                  자세히 보기 →
                </p>
              </button>
            );
          })}
        </div>
      )}

      {openNote && (
        <ReleaseNotesDialog
          notes={[openNote]}
          onClose={() => setOpenVersion(null)}
        />
      )}
    </>
  );
}
