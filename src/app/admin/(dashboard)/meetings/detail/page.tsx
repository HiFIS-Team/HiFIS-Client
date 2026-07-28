"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ClockIcon,
  LinkIcon,
  PrinterIcon,
  ShareIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../../PageTitle";
import { MEETINGS_DETAIL } from "./mock";

// 회의록 상세 페이지 — mock 데이터. 실제 API 는 GET /meetings/{id} 붙는 시점.
// 정적 export 제약으로 dynamic route [id] 못 씀 → 쿼리 파라미터 (?id=1).

export default function MeetingsDetailPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <MeetingsDetailInner />
    </Suspense>
  );
}

function MeetingsDetailInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "1";
  const meeting = MEETINGS_DETAIL[id] ?? MEETINGS_DETAIL["1"];

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={meeting.title} />

      {/* 상단 : 뒤로가기 · 우측 액션 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/meetings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
        >
          <ArrowLeftIcon className="size-4" />
          회의록 목록
        </Link>
        <div className="flex items-center gap-1">
          <ActionButton icon={LinkIcon} label="링크 복사" />
          <IconAction icon={StarIcon} aria="즐겨찾기" />
          <IconAction icon={ShareIcon} aria="공유" />
          <ActionButton icon={PrinterIcon} label="인쇄" />
          <ActionButton icon={ClockIcon} label="히스토리" />
        </div>
      </div>

      {/* 헤더 블록 : 큰 제목 · 작성자 · 공개 범위 */}
      <header className="mt-8">
        <h1 className="text-4xl font-black tracking-tighter text-fg">
          {meeting.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <span
              className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold text-white ${meeting.authorTone}`}
              aria-hidden
            >
              {meeting.author.charAt(0)}
            </span>
            <span className="font-medium text-fg">{meeting.author}</span>
          </span>
          <span>·</span>
          <span className="tabular-nums">{meeting.date}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted">공개 범위:</span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
            {meeting.scope}
          </span>
        </div>
      </header>

      {/* 본문 : 노션 스타일 렌더 */}
      <article className="mt-10 border-t border-line pt-10 pb-16">
        <MeetingBody body={meeting.body} />
      </article>
    </div>
  );
}

// ─────────────── header actions ───────────────

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-card-hover"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function IconAction({
  icon: Icon,
  aria,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  aria: string;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      className="rounded-md p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
    >
      <Icon className="size-4" />
    </button>
  );
}

// ─────────────── body renderer ───────────────

export type MeetingBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; emoji?: string; text: string }
  | { type: "meta"; label: string; value: string }
  | { type: "attendees"; label: string; names: string[] }
  | { type: "list"; ordered?: boolean; items: MeetingListItem[] }
  | { type: "quote"; text: string }
  | { type: "divider" };

export type MeetingListItem = InlineSpan[];

// 인라인 서식 — 텍스트 조각 배열.
export type InlineSpan =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "highlight"; text: string }; // 노란색 형광펜

function MeetingBody({ body }: { body: MeetingBlock[] }) {
  return (
    <div className="space-y-8">
      {body.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: MeetingBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="text-3xl font-black tracking-tighter text-fg">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-fg">
          {block.emoji && (
            <span aria-hidden className="text-2xl">
              {block.emoji}
            </span>
          )}
          {block.text}
        </h3>
      );
    case "meta":
      return (
        <p className="text-base leading-7 text-fg">
          <span className="font-bold">{block.label}</span>
          <span className="mx-1.5 text-muted">·</span>
          <span className="italic text-fg">{block.value}</span>
        </p>
      );
    case "attendees":
      return (
        <p className="flex flex-wrap items-center gap-2 text-base leading-7 text-fg">
          <span className="font-bold">{block.label}</span>
          {block.names.map((n) => (
            <span
              key={n}
              className="inline-flex items-center rounded-md bg-primary/20 px-2 py-0.5 text-sm font-semibold text-primary"
            >
              @{n}
            </span>
          ))}
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol className="ml-6 list-decimal space-y-2 text-base leading-7 text-fg marker:text-muted">
          {block.items.map((spans, i) => (
            <li key={i} className="pl-1">
              <Inline spans={spans} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="ml-6 list-disc space-y-2 text-base leading-7 text-fg marker:text-muted">
          {block.items.map((spans, i) => (
            <li key={i} className="pl-1">
              <Inline spans={spans} />
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-line bg-card-hover px-5 py-3 text-sm italic leading-6 text-muted">
          {block.text}
        </blockquote>
      );
    case "divider":
      return <hr className="border-line" />;
  }
}

function Inline({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((s, i) => {
        switch (s.kind) {
          case "text":
            return <span key={i}>{s.text}</span>;
          case "bold":
            return (
              <strong key={i} className="font-bold text-fg">
                {s.text}
              </strong>
            );
          case "italic":
            return (
              <em key={i} className="italic text-fg">
                {s.text}
              </em>
            );
          case "highlight":
            return (
              <mark
                key={i}
                className="rounded bg-amber-300/60 px-1 text-fg"
              >
                {s.text}
              </mark>
            );
        }
      })}
    </>
  );
}
