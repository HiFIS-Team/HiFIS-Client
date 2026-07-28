"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import {
  deleteNotice,
  listNotices,
  type NoticeOut,
} from "@/lib/api/v2/notices";
import { PageTitle } from "../PageTitle";
import { NewNoticeDialog } from "./NewNoticeDialog";

// 사내공지 — GET /notices (백엔드가 pinned desc, created_at desc 로 정렬).
// 삭제는 SUPER_ADMIN 만 노출 (백엔드는 ADMIN·MANAGER 다 되지만, v1 me adapter 로는 MANAGER 판별 불가 — 리팩터링 이슈).

export default function NoticesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const noticesQuery = useQuery({
    queryKey: ["v2", "notices"] as const,
    queryFn: listNotices,
  });
  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });

  const notices = noticesQuery.data ?? [];

  // 첫 로드 · 데이터 변경 시 선택 유지 (기존 선택이 유효하지 않으면 첫 항목).
  useEffect(() => {
    if (notices.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !notices.some((n) => n.id === selectedId)) {
      setSelectedId(notices[0].id);
    }
  }, [notices, selectedId]);

  const selected = notices.find((n) => n.id === selectedId) ?? null;

  const employeeLookup = useMemo(() => {
    const map = new Map<
      string,
      { name: string; avatarColor: string | undefined }
    >();
    for (const e of employeesQuery.data ?? []) {
      map.set(e.id, { name: e.name, avatarColor: e.avatarColor });
    }
    return map;
  }, [employeesQuery.data]);

  const canManage = meQuery.data?.role === "SUPER_ADMIN";

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "notices"] });
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["v2", "notices"] });
  }

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
            onClick={refresh}
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon
              className={`size-4 ${noticesQuery.isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />새 공지
          </button>
        </div>
      </div>

      <NewNoticeDialog open={newOpen} onClose={() => setNewOpen(false)} />

      {/* 본문 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <NoticeListCard
            notices={notices}
            selectedId={selectedId}
            onSelect={setSelectedId}
            employeeLookup={employeeLookup}
            isLoading={noticesQuery.isLoading}
            isError={noticesQuery.isError}
            error={noticesQuery.error}
            onRetry={() => noticesQuery.refetch()}
          />
        </div>
        <div className="lg:col-span-2">
          {noticesQuery.isLoading ? (
            <DetailSkeleton />
          ) : selected ? (
            <NoticeDetail
              notice={selected}
              author={employeeLookup.get(selected.authorId)}
              canManage={canManage}
              onDelete={() => {
                if (confirm("정말 삭제할까요? 되돌릴 수 없어요.")) {
                  deleteMutation.mutate(selected.id);
                }
              }}
              deleting={deleteMutation.isPending}
              deleteError={
                deleteMutation.isError
                  ? getV2ErrorMessage(deleteMutation.error)
                  : null
              }
            />
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
  employeeLookup,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  notices: NoticeOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  employeeLookup: Map<
    string,
    { name: string; avatarColor: string | undefined }
  >;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">
          공지 목록{" "}
          <span className="text-muted tabular-nums">({notices.length})</span>
        </h2>
      </div>
      {isLoading ? (
        <ul className="divide-y divide-line">
          {[0, 1, 2].map((i) => (
            <li key={i} className="animate-pulse px-5 py-4">
              <div className="h-3 w-2/3 rounded bg-card-hover" />
              <div className="mt-2 h-2 w-1/3 rounded bg-card-hover" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <ExclamationTriangleIcon className="size-6 text-red-400" />
          <p className="text-xs text-fg">{getV2ErrorMessage(error)}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-line px-3 py-1 text-xs font-semibold text-fg hover:bg-card-hover"
          >
            다시 시도
          </button>
        </div>
      ) : notices.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-muted">
          아직 공지가 없어요.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {notices.map((n) => {
            const active = selectedId === n.id;
            const author = employeeLookup.get(n.authorId);
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
                      <MiniAvatar
                        name={author?.name ?? "…"}
                        tone={avatarTone(author?.avatarColor)}
                      />
                      <span>{author?.name ?? "…"}</span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {formatDate(n.createdAt)}
                      </span>
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
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

function NoticeDetail({
  notice,
  author,
  canManage,
  onDelete,
  deleting,
  deleteError,
}: {
  notice: NoticeOut;
  author: { name: string; avatarColor: string | undefined } | undefined;
  canManage: boolean;
  onDelete: () => void;
  deleting: boolean;
  deleteError: string | null;
}) {
  return (
    <div className="rounded-lg border border-line bg-card">
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
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
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(author?.avatarColor)}`}
                aria-hidden
              >
                {(author?.name ?? "?").charAt(0)}
              </span>
              <span className="font-semibold text-fg">
                {author?.name ?? "알 수 없음"}
              </span>
              <span>·</span>
              <span className="tabular-nums">
                {formatDate(notice.createdAt)}
              </span>
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <TrashIcon className="size-3.5" />
              삭제
            </button>
          )}
        </div>
        {deleteError && (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {deleteError}
          </p>
        )}
      </div>
      <div className="px-6 py-5">
        <pre className="font-sans text-sm leading-6 whitespace-pre-wrap text-fg">
          {notice.body}
        </pre>
      </div>
    </div>
  );
}

// ─────────────── panels ───────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-line bg-card">
      <div className="border-b border-line px-6 py-5">
        <div className="h-5 w-2/3 rounded bg-card-hover" />
        <div className="mt-3 h-3 w-1/3 rounded bg-card-hover" />
      </div>
      <div className="space-y-2 px-6 py-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 rounded bg-card-hover" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-card p-8 text-center">
      <MegaphoneIcon className="size-8 text-muted/70" />
      <p className="text-sm text-muted">좌측에서 공지를 선택해주세요.</p>
    </div>
  );
}

// ISO → "2026. 7. 27."
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
