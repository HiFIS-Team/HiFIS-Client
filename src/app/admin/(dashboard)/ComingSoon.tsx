"use client";

import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { PageTitle } from "./PageTitle";

// 아직 구현 안 된 사이드바 메뉴용 안내 placeholder — 링크가 404 로 튀는 걸 막고
// 대신 "준비 중" 카드 렌더. 라벨은 페이지마다 다르게.
export function ComingSoon({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <PageTitle title={title} />
      <h1 className="text-2xl font-black tracking-tighter text-fg">{title}</h1>
      <div className="mt-8 flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-card p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <WrenchScrewdriverIcon className="size-6" />
        </div>
        <p className="text-base font-bold text-fg">준비 중이에요</p>
        <p className="max-w-md text-sm text-muted">
          {hint ?? "곧 만나실 수 있도록 준비하고 있어요. 조금만 기다려 주세요."}
        </p>
      </div>
    </div>
  );
}
