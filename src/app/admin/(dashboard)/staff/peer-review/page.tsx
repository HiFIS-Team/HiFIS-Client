"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  LockClosedIcon,
  StarIcon as StarOutline,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { getMe } from "@/lib/api/auth";
import { useToast } from "@/providers/ToastProvider";
import { PageTitle } from "../../PageTitle";
import { MobileSubPage } from "../../MobileSubPage";

// 동료 평가 — 월 단위. 본인 지점 FC 들 (본인 포함) 한 명씩 평가.
// 한 번 제출하면 그 사람 평가는 잠김 (수정 불가). 다른 동료는 계속 작성 가능.
// 색은 border + bg-primary/N opacity 위주 (다크 테마 swap 친화).
//
// 백엔드 연결 전:
//   - 동료 목록은 mock (실제로는 getAdmins() 같은 지점 FC 리스트 호출)
//   - 제출 데이터는 localStorage 에 월별 키로 저장
//   - 백엔드 붙으면 useQuery + mutation 으로 교체

type Colleague = {
  id: string;
  name: string;
  position: string; // 점장 / 팀장 / 트레이너 / FC
};

// TODO: 백엔드 연결 시 본인 지점 FC 목록 API 로 교체.
const MOCK_COLLEAGUES: Colleague[] = [
  { id: "c-1", name: "김민수", position: "점장" },
  { id: "c-2", name: "박지영", position: "팀장" },
  { id: "c-3", name: "이은후", position: "트레이너" },
  { id: "c-4", name: "박회순", position: "FC" },
  { id: "c-5", name: "이명진", position: "FC" },
];

type Review = {
  score: number; // 1-5
  strength: string;
  improvement: string;
  submittedAt: number;
};

type ReviewsMap = Record<string, Review>;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function storageKey(month: string): string {
  return `peer-review:${month}`;
}
function loadReviews(month: string): ReviewsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(month));
    return raw ? (JSON.parse(raw) as ReviewsMap) : {};
  } catch {
    return {};
  }
}
function saveReviews(month: string, map: ReviewsMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(month), JSON.stringify(map));
}

export default function StaffPeerReviewPage() {
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const myName = meQuery.data?.name ?? "";
  const toast = useToast();

  // 본인 포함 — 본인이 mock 목록에 없으면 맨 앞에 추가.
  // (실제 API 면 응답에 본인이 이미 포함돼 있을 것)
  const colleagues: Colleague[] = myName
    ? MOCK_COLLEAGUES.some((c) => c.name === myName)
      ? MOCK_COLLEAGUES
      : [{ id: "me", name: myName, position: "본인" }, ...MOCK_COLLEAGUES]
    : MOCK_COLLEAGUES;

  const month = currentMonthKey();
  const [reviews, setReviews] = useState<ReviewsMap>({});
  // mount 후 localStorage 에서 로드 (SSR 호환)
  useEffect(() => {
    setReviews(loadReviews(month));
  }, [month]);

  const [openId, setOpenId] = useState<string | null>(null);
  const openColleague = openId
    ? colleagues.find((c) => c.id === openId)
    : null;
  const openReview = openId ? (reviews[openId] ?? null) : null;

  function handleSubmit(colleagueId: string, draft: Omit<Review, "submittedAt">) {
    const next: ReviewsMap = {
      ...reviews,
      [colleagueId]: { ...draft, submittedAt: Date.now() },
    };
    setReviews(next);
    saveReviews(month, next);
    setOpenId(null);
    toast.success("평가를 제출했어요.");
  }

  const submittedCount = colleagues.filter((c) => reviews[c.id]).length;
  const monthLabel = (() => {
    const [y, m] = month.split("-");
    return `${y}년 ${parseInt(m, 10)}월`;
  })();

  return (
    <div>
      <PageTitle title="동료 평가" />

      {/* 동료 카드 그리드 — 제출 완료 / 미제출 두 상태.
          제출 완료: border-primary/30 + bg-primary/10 + ✓ 체크
          미제출: border-line + bg-card
          평가 월·제출 카운트는 그리드 아래로 옮김 — 페이지 상단을 비워 카드가
          SubTabBar 와 가깝게. */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {colleagues.map((c) => {
          const review = reviews[c.id];
          const submitted = !!review;
          const isMe = c.name === myName;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                submitted
                  ? "border-primary/30 bg-primary/10"
                  : "border-line bg-card hover:bg-card-hover"
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">
                    {c.name}
                    {isMe && (
                      <span className="ml-1 text-[10px] font-medium text-muted">
                        (본인)
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">{c.position}</p>
                </div>
                {submitted && (
                  <CheckCircleIcon className="size-4 shrink-0 text-primary" />
                )}
              </div>
              <p
                className={`mt-1 text-[11px] ${
                  submitted ? "text-primary" : "text-muted"
                }`}
              >
                {submitted ? "제출 완료" : "작성 전"}
              </p>
            </button>
          );
        })}
      </div>

      {/* 그리드 아래 카운트 줄 — 페이지 상단을 카드로 비워두기 위해 여기로 이동. */}
      <p className="mt-4 text-center text-xs text-muted">
        {monthLabel} 평가 ·{" "}
        <span className="font-semibold text-fg tabular-nums">
          {submittedCount} / {colleagues.length}
        </span>{" "}
        제출
      </p>

      {openColleague && (
        <MobileSubPage
          title={`${openColleague.name} 평가`}
          onClose={() => setOpenId(null)}
          noScroll
        >
          <ReviewForm
            colleague={openColleague}
            existing={openReview}
            isSelf={openColleague.name === myName}
            onSubmit={(draft) => handleSubmit(openColleague.id, draft)}
          />
        </MobileSubPage>
      )}
    </div>
  );
}

// 한 동료에 대한 평가 폼 — 점수 (1-5 별) + 잘한점 + 개선점.
// 제출되면 (existing 있음) read-only 로 표시 + 잠금 안내.
// isSelf : 본인 평가 케이스 — 환산 안내가 다름 (별 하나당 1점, 최대 5점).
function ReviewForm({
  colleague,
  existing,
  isSelf,
  onSubmit,
}: {
  colleague: Colleague;
  existing: Review | null;
  isSelf: boolean;
  onSubmit: (draft: Omit<Review, "submittedAt">) => void;
}) {
  const locked = !!existing;
  const [score, setScore] = useState<number>(existing?.score ?? 0);
  const [strength, setStrength] = useState(existing?.strength ?? "");
  const [improvement, setImprovement] = useState(existing?.improvement ?? "");

  const canSubmit =
    score >= 1 && strength.trim().length > 0 && improvement.trim().length > 0;

  return (
    <div className={`mx-auto max-w-2xl ${!locked ? "pb-24" : ""}`}>
      <header className="mb-5">
        <p className="text-xs font-medium text-muted">평가 대상</p>
        <p className="mt-0.5 text-lg font-bold tracking-tight text-fg">
          {colleague.name}{" "}
          <span className="text-sm font-normal text-muted">
            · {colleague.position}
          </span>
        </p>
      </header>

      {locked && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-line bg-card-hover px-3 py-2.5 text-sm text-muted">
          <LockClosedIcon className="mt-0.5 size-4 shrink-0 text-muted" />
          <p>제출 완료된 평가는 수정할 수 없어요.</p>
        </div>
      )}

      {/* 점수 — 1-5 별점.
          본인 평가는 환산 가중치 낮음 (별 하나당 1점, 최대 5점),
          동료 평가는 별 하나당 4점 (최대 20점). 안내문만 분기. */}
      <section>
        <label className="text-sm font-semibold text-fg">
          점수{" "}
          <span className="ml-1 text-xs font-normal text-muted">
            (별 하나당 {isSelf ? "1점" : "4점"}입니다)
          </span>
        </label>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= score;
            const Icon = filled ? StarSolid : StarOutline;
            return (
              <button
                key={n}
                type="button"
                onClick={() => !locked && setScore(n)}
                disabled={locked}
                aria-label={`${n}점`}
                className={`rounded-md p-1 transition-colors ${
                  locked
                    ? "cursor-default"
                    : "hover:bg-primary/10 active:scale-95"
                }`}
              >
                <Icon
                  className={`size-7 ${filled ? "text-amber-400" : "text-line"}`}
                />
              </button>
            );
          })}
          <span className="ml-2 text-sm font-medium tabular-nums text-fg">
            {score > 0 ? `${score} / 5` : "선택"}
          </span>
        </div>
      </section>

      {/* 잘한점 */}
      <section className="mt-6">
        <label htmlFor="strength" className="text-sm font-semibold text-fg">
          잘한점
        </label>
        <textarea
          id="strength"
          value={strength}
          onChange={(e) => setStrength(e.target.value)}
          readOnly={locked}
          rows={4}
          placeholder="이번 달 인상 깊었던 잘한 점을 적어주세요"
          className={`mt-2 w-full rounded-lg border border-line bg-card-hover px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none ${
            locked ? "cursor-default opacity-80" : ""
          }`}
        />
      </section>

      {/* 개선점 */}
      <section className="mt-5">
        <label
          htmlFor="improvement"
          className="text-sm font-semibold text-fg"
        >
          개선점
        </label>
        <textarea
          id="improvement"
          value={improvement}
          onChange={(e) => setImprovement(e.target.value)}
          readOnly={locked}
          rows={4}
          placeholder="앞으로 더 좋아질 수 있는 점을 적어주세요"
          className={`mt-2 w-full rounded-lg border border-line bg-card-hover px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none ${
            locked ? "cursor-default opacity-80" : ""
          }`}
        />
      </section>

      {/* 제출 액션 바 — viewport 하단에 고정.
          MobileSubPage 안에서 fixed inset-x-0 bottom-0 로 viewport 에 박힘.
          제출됨 (locked) 케이스에선 안내·버튼 모두 의미 없으니 렌더하지 않음. */}
      {!locked && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="text-xs text-muted">
              제출 후엔 수정할 수 없어요.
            </p>
            <button
              type="button"
              onClick={() =>
                canSubmit && onSubmit({ score, strength, improvement })
              }
              disabled={!canSubmit}
              className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              제출하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
