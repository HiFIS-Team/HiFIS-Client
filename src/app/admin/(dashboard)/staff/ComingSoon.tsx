"use client";

import type { ComponentType } from "react";
import { PageTitle } from "../PageTitle";

// 직원관리(평가) 6 종 페이지 공용 "준비중" 플레이스홀더.
// 백엔드·평가 모델 정리 후 실제 화면으로 교체. 그 전까지는 이 컴포넌트로 같은 톤 유지.
export function ComingSoon({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <PageTitle title={title} />
      <div className="mt-10 flex flex-col items-center gap-4 px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/15">
          <Icon className="size-8 text-primary" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-fg">
          {title}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </p>
        <span className="mt-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
          준비중
        </span>
      </div>
    </div>
  );
}
