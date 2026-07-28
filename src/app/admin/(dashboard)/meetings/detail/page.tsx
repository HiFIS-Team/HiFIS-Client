"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PencilSquareIcon,
  PrinterIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import {
  deleteMeeting,
  getMeeting,
  scopeLabel,
  type MeetingOut,
} from "@/lib/api/v2/meetings";
import { PageTitle } from "../../PageTitle";
import { MeetingEditor } from "../new/MeetingEditor";

// 회의록 상세 — GET /meetings/{id}.
// blocks 는 tiptap MeetingEditor 를 read-only 로 렌더.
// 삭제는 작성자 · 관리자만 (백엔드가 403 리턴 시 에러 노출).

export default function MeetingsDetailPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <MeetingsDetailInner />
    </Suspense>
  );
}

function MeetingsDetailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const queryClient = useQueryClient();

  const meetingQuery = useQuery({
    queryKey: ["v2", "meetings", id] as const,
    queryFn: () => getMeeting(id!),
    enabled: !!id,
  });
  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });

  const deleteMutation = useMutation({
    mutationFn: (mid: string) => deleteMeeting(mid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "meetings"] });
      router.push("/admin/meetings");
    },
  });

  if (!id) {
    return (
      <ErrorPanel message="회의록 ID가 필요합니다." backHref="/admin/meetings" />
    );
  }
  if (meetingQuery.isLoading) return <LoadingPanel />;
  if (meetingQuery.isError) {
    return (
      <ErrorPanel
        message={getV2ErrorMessage(meetingQuery.error)}
        backHref="/admin/meetings"
        onRetry={() => meetingQuery.refetch()}
      />
    );
  }
  const meeting = meetingQuery.data;
  if (!meeting) return <LoadingPanel />;

  const author = (employeesQuery.data ?? []).find(
    (e) => e.id === meeting.authorId,
  );
  const canEdit =
    !!meQuery.data &&
    (meQuery.data.role === "SUPER_ADMIN" || meeting.authorId === meQuery.data.id);

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
          <ActionButton icon={LinkIcon} label="링크 복사" onClick={copyLink} />
          <IconAction icon={StarIcon} aria="즐겨찾기" />
          <IconAction icon={ShareIcon} aria="공유" />
          <ActionButton icon={PrinterIcon} label="인쇄" onClick={() => window.print()} />
          <ActionButton icon={ClockIcon} label="히스토리" />
          {canEdit && (
            <>
              <span className="mx-1 h-5 w-px bg-line" aria-hidden />
              <ActionButton icon={PencilSquareIcon} label="편집" />
              <IconAction
                icon={TrashIcon}
                aria="삭제"
                onClick={() => {
                  if (confirm("정말 삭제할까요? 되돌릴 수 없어요.")) {
                    deleteMutation.mutate(meeting.id);
                  }
                }}
                danger
              />
            </>
          )}
        </div>
      </div>

      {/* 헤더 : 큰 제목 · 작성자 · 공개 범위 */}
      <header className="mt-8">
        <h1 className="text-4xl font-black tracking-tighter text-fg">
          {meeting.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <span
              className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(author?.avatarColor)}`}
              aria-hidden
            >
              {(author?.name ?? "?").charAt(0)}
            </span>
            <span className="font-medium text-fg">
              {author?.name ?? "알 수 없음"}
            </span>
          </span>
          <span>·</span>
          <span className="tabular-nums">{formatMeetingAt(meeting.meetingAt)}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted">공개 범위:</span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${scopeTone(meeting.scope)}`}
          >
            {scopeLabel(meeting.scope)}
          </span>
        </div>
      </header>

      {/* 본문 — tiptap read-only */}
      <article className="mt-10 border-t border-line pt-6 pb-16">
        {Array.isArray(meeting.blocks) && meeting.blocks.length > 0 ? (
          <MeetingEditor
            key={meeting.id}
            initialBlocks={meeting.blocks as unknown[]}
            editable={false}
          />
        ) : (
          <p className="text-sm text-muted">본문이 비어있어요.</p>
        )}
      </article>

      {deleteMutation.isError && (
        <div className="fixed inset-x-0 bottom-6 mx-auto max-w-md rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 shadow-lg">
          {getV2ErrorMessage(deleteMutation.error)}
        </div>
      )}
    </div>
  );
}

function copyLink() {
  if (typeof window === "undefined") return;
  void navigator.clipboard.writeText(window.location.href);
}

function scopeTone(scope: MeetingOut["scope"]): string {
  return scope === "COMPANY"
    ? "bg-emerald-500/15 text-emerald-400"
    : scope === "PROJECT"
      ? "bg-violet-500/15 text-violet-400"
      : "bg-amber-500/15 text-amber-400";
}

function formatMeetingAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ─────────────── panels ───────────────

function LoadingPanel() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="h-4 w-24 animate-pulse rounded bg-card-hover" />
      <div className="mt-8 h-10 w-2/3 animate-pulse rounded bg-card-hover" />
      <div className="mt-4 h-4 w-40 animate-pulse rounded bg-card-hover" />
      <div className="mt-10 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-card-hover" />
        ))}
      </div>
    </div>
  );
}

function ErrorPanel({
  message,
  backHref,
  onRetry,
}: {
  message: string;
  backHref: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeftIcon className="size-4" />
        회의록 목록
      </Link>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-line bg-card px-6 py-12 text-center">
        <ExclamationTriangleIcon className="size-8 text-red-400" />
        <p className="text-sm text-fg">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-card-hover"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────── header actions ───────────────

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  onClick,
  danger,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  aria: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={`rounded-md p-2 transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-muted hover:bg-card-hover hover:text-fg"
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}
