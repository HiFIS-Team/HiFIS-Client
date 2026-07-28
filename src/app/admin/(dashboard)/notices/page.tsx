"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  MegaphoneIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";

// 사내공지 페이지 — 좌 목록 + 우 상세. mock. API 는 다음 스텝.

// ─────────────── mock ───────────────

interface Notice {
  id: string;
  title: string;
  body: string;
  author: { name: string; tone: string };
  createdAt: string;
  pinned?: boolean;
}

const NOTICES: Notice[] = [
  {
    id: "n1",
    title: "5월 전사 정기 미팅 일정 안내",
    body: `5월 전사 정기 미팅 일정을 안내드립니다.

일시: 5월 15일 (수) 오후 3시 ~ 5시
장소: 본사 대회의실 (온라인 병행 — 링크는 당일 알림톡)

안건
- Q1 실적 리뷰
- 5월 · 6월 로드맵 공유
- Q&A

전 직원 필수 참석 부탁드립니다. 부득이한 사유로 참석이 어려운 경우 팀 리드에게 사전 공유 주세요.`,
    author: { name: "이앨리스", tone: "bg-emerald-500" },
    createdAt: "2026. 7. 27.",
    pinned: true,
  },
  {
    id: "n2",
    title: "여름 휴가 사용 가이드 — 6 ~ 8월",
    body: `여름 성수기(6 ~ 8월) 휴가 사용 가이드입니다.

- 팀별 최소 인원 유지 : 담당 리드와 조율 후 캘린더 등록
- 연속 5일 이상 휴가는 2주 전 사전 공유
- 공용 계정 · 오픈 이슈 인수인계는 휴가 시작 전날까지 완료

문의는 인사팀 채널로 부탁드립니다.`,
    author: { name: "한이브", tone: "bg-violet-500" },
    createdAt: "2026. 7. 25.",
  },
  {
    id: "n3",
    title: "5월 신규 입사자 환영 인사",
    body: `5월에 새로 합류한 세 분을 환영합니다.

- 김OO (프로덕트팀)
- 박OO (개발팀)
- 이OO (디자인팀)

첫 주 온보딩 체크리스트는 문서함 > 회사 운영 > "신규 입사자 온보딩 체크리스트" 를 참고해 주세요.
사내톡에서 마주치면 반갑게 인사 부탁드려요.`,
    author: { name: "김데모", tone: "bg-primary" },
    createdAt: "2026. 7. 23.",
  },
  {
    id: "n4",
    title: "사무실 정수기 점검 예정 — 5/12 오전",
    body: `5월 12일 (월) 오전 10시 ~ 11시 사이 정수기 필터 교체 · 점검이 진행됩니다.
해당 시간 동안 정수기 사용이 잠깐 불가하니 사전 참고 부탁드려요.`,
    author: { name: "한이브", tone: "bg-violet-500" },
    createdAt: "2026. 7. 22.",
  },
];

// ─────────────── page ───────────────

export default function NoticesPage() {
  // 상단 고정 공지 먼저, 그다음 최신순 (mock 는 이미 정렬된 상태).
  const sorted = [...NOTICES].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const [selectedId, setSelectedId] = useState<string | null>(
    sorted[0]?.id ?? null,
  );
  const selected = sorted.find((n) => n.id === selectedId) ?? null;

  return (
    <div>
      <PageTitle title="사내공지" />

      {/* 상단 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-fg">
            사내공지
          </h1>
          <p className="mt-1 text-sm text-muted">회사 전체 공지사항입니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon className="size-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />새 공지
          </button>
        </div>
      </div>

      {/* 본문 : lg 에서 좌 1/3 · 우 2/3 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <NoticeListCard
            notices={sorted}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <NoticeDetail notice={selected} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────── NoticeListCard ───────────────

function NoticeListCard({
  notices,
  selectedId,
  onSelect,
}: {
  notices: Notice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">
          공지 목록{" "}
          <span className="text-muted tabular-nums">({notices.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-line">
        {notices.map((n) => {
          const active = selectedId === n.id;
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                  active ? "bg-primary/15" : "hover:bg-card-hover"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
                        <SparklesIcon className="size-3" />
                        고정
                      </span>
                    )}
                    <span className="truncate text-sm font-bold text-fg">
                      {n.title}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <MiniAvatar name={n.author.name} tone={n.author.tone} />
                    <span>{n.author.name}</span>
                    <span>·</span>
                    <span className="tabular-nums">{n.createdAt}</span>
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MiniAvatar({ name, tone }: { name: string; tone: string }) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${tone}`}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  );
}

// ─────────────── NoticeDetail ───────────────

function NoticeDetail({ notice }: { notice: Notice }) {
  return (
    <div className="rounded-lg border border-line bg-card">
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          {notice.pinned && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
              <SparklesIcon className="size-3" />
              고정
            </span>
          )}
          <h2 className="text-lg font-bold text-fg">{notice.title}</h2>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${notice.author.tone}`}
            aria-hidden
          >
            {notice.author.name.charAt(0)}
          </span>
          <span className="font-semibold text-fg">{notice.author.name}</span>
          <span>·</span>
          <span className="tabular-nums">{notice.createdAt}</span>
        </p>
      </div>
      <div className="px-6 py-5">
        <pre className="font-sans text-sm leading-6 whitespace-pre-wrap text-fg">
          {notice.body}
        </pre>
      </div>
    </div>
  );
}

// ─────────────── EmptyState ───────────────

function EmptyState() {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-card p-8 text-center">
      <MegaphoneIcon className="size-8 text-muted/70" />
      <p className="text-sm text-muted">좌측에서 공지를 선택해주세요.</p>
    </div>
  );
}
