"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

// 페이지네이션 컨트롤 — 회원/PT/예약/알림톡 list 페이지 공용.
// total·page·page_size 받고, 이전/다음 버튼 + 현재 페이지 인디케이터.
// 페이지 번호 직접 클릭은 페이지가 많을 때 복잡해져서 일단 prev/next 만.
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function change(next: number) {
    onPageChange(next);
    // 페이지 이동 시 맨 위로 — 새 데이터 보러 다시 스크롤 안 올리도록
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const fromIdx = (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <p className="text-muted">
        <span className="font-semibold text-fg">
          {fromIdx.toLocaleString()}–{toIdx.toLocaleString()}
        </span>
        {" / "}
        <span className="font-semibold text-fg">
          {total.toLocaleString()}
        </span>
        건
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => change(page - 1)}
          disabled={!canPrev}
          aria-label="이전 페이지"
          className="flex size-9 items-center justify-center rounded-md border border-line text-muted hover:bg-card-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="px-3 text-sm text-muted tabular-nums">
          <span className="font-semibold text-fg">{page}</span>
          {" / "}
          {totalPages}
        </span>
        <button
          type="button"
          onClick={() => change(page + 1)}
          disabled={!canNext}
          aria-label="다음 페이지"
          className="flex size-9 items-center justify-center rounded-md border border-line text-muted hover:bg-card-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
