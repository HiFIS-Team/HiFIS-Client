"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShoppingCartIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { getMe as getMeV2 } from "@/lib/api/v2/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import {
  commentApproval,
  listApprovals,
  statusLabel,
  withdrawApproval,
  type ApprovalOut,
  type ApprovalStatus,
  type ApprovalStep,
} from "@/lib/api/v2/approvals";
import { PageTitle } from "../PageTitle";
import { NewApprovalDialog } from "./NewApprovalDialog";

// 전자결재 페이지 — GET /approvals?box=mine 기준 (내가 올린 것).
// 필터 : 진행 중 / 승인 / 반려 / 회수 / 전체 (클라이언트).
// 상세 : 결재선(steps) · 댓글 · 회수 액션 (본인 · IN_PROGRESS).

// 종류별 아이콘 · 톤 (kind 는 자유 문자열, 미매핑은 fallback).
const KIND_ICON: Record<
  string,
  { icon: ComponentType<SVGProps<SVGSVGElement>>; bg: string; text: string }
> = {
  "출장 신청": {
    icon: PaperAirplaneIcon,
    bg: "bg-primary/15",
    text: "text-primary",
  },
  "외근 신청": {
    icon: TruckIcon,
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
  },
  구매요청: {
    icon: ShoppingCartIcon,
    bg: "bg-orange-500/15",
    text: "text-orange-400",
  },
  "구매 요청": {
    icon: ShoppingCartIcon,
    bg: "bg-orange-500/15",
    text: "text-orange-400",
  },
  지출결의: {
    icon: BanknotesIcon,
    bg: "bg-pink-500/15",
    text: "text-pink-400",
  },
  "일반 품의": {
    icon: DocumentTextIcon,
    bg: "bg-violet-500/15",
    text: "text-violet-400",
  },
};
const KIND_FALLBACK = {
  icon: DocumentTextIcon,
  bg: "bg-card-hover",
  text: "text-muted",
};
function kindMeta(kind: string) {
  return KIND_ICON[kind] ?? KIND_FALLBACK;
}

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  IN_PROGRESS: "bg-yellow-400/15 text-yellow-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-400",
  WITHDRAWN: "bg-card-hover text-muted",
};

type StatusFilter = "all" | "waiting" | "approved" | "rejected" | "withdrawn";

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const queryClient = useQueryClient();

  const approvalsQuery = useQuery({
    queryKey: ["v2", "approvals", "mine"] as const,
    queryFn: () => listApprovals("mine"),
  });
  const approvals = approvalsQuery.data ?? [];

  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
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

  const meQuery = useQuery({ queryKey: ["v2", "me"], queryFn: getMeV2 });
  const meId = meQuery.data?.id ?? null;

  const filtered = useMemo(() => {
    switch (filter) {
      case "all":
        return approvals;
      case "waiting":
        return approvals.filter((a) => a.status === "IN_PROGRESS");
      case "approved":
        return approvals.filter((a) => a.status === "APPROVED");
      case "rejected":
        return approvals.filter((a) => a.status === "REJECTED");
      case "withdrawn":
        return approvals.filter((a) => a.status === "WITHDRAWN");
    }
  }, [approvals, filter]);

  const counts = useMemo(
    () => ({
      all: approvals.length,
      waiting: approvals.filter((a) => a.status === "IN_PROGRESS").length,
      approved: approvals.filter((a) => a.status === "APPROVED").length,
      rejected: approvals.filter((a) => a.status === "REJECTED").length,
      withdrawn: approvals.filter((a) => a.status === "WITHDRAWN").length,
    }),
    [approvals],
  );

  // 유효 선택 계산.
  const inFilteredSet = filtered.some((a) => a.id === selectedId);
  const effectiveId = inFilteredSet ? selectedId : filtered[0]?.id ?? null;
  const selected = effectiveId
    ? approvals.find((a) => a.id === effectiveId) ?? null
    : null;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["v2", "approvals"] });
  }

  return (
    <div>
      <PageTitle title="전자결재" />

      {/* 상단 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">업무</p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-fg">
            전자결재
          </h1>
          <p className="mt-1 text-sm text-muted">
            출장·외근·지출·구매 등 사내 결재를 한 곳에서 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon
              className={`size-4 ${approvalsQuery.isFetching ? "animate-spin" : ""}`}
            />
          </button>

          <div className="inline-flex rounded-full border border-line p-0.5">
            <ScopeButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
              count={counts.all}
              countTone="bg-card-hover text-fg"
            >
              전체
            </ScopeButton>
            <ScopeButton
              active={filter === "waiting"}
              onClick={() => setFilter("waiting")}
              count={counts.waiting}
              countTone="bg-yellow-400/20 text-yellow-400"
            >
              대기
            </ScopeButton>
            <ScopeButton
              active={filter === "approved"}
              onClick={() => setFilter("approved")}
              count={counts.approved}
              countTone="bg-emerald-500/20 text-emerald-400"
            >
              승인
            </ScopeButton>
            <ScopeButton
              active={filter === "rejected"}
              onClick={() => setFilter("rejected")}
              count={counts.rejected}
              countTone="bg-red-500/20 text-red-400"
            >
              반려
            </ScopeButton>
          </div>

          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />새 결재
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <RequestListCard
            approvals={filtered}
            selectedId={effectiveId}
            onSelect={setSelectedId}
            isLoading={approvalsQuery.isLoading}
            isError={approvalsQuery.isError}
            error={approvalsQuery.error}
          />
        </div>
        <div className="lg:col-span-2">
          {approvalsQuery.isLoading ? (
            <div className="h-64 animate-pulse rounded-lg border border-line bg-card" />
          ) : selected ? (
            <DetailPanel
              approval={selected}
              employeeLookup={employeeLookup}
              meId={meId}
              onChanged={refresh}
            />
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-card p-8 text-center">
              <p className="text-sm text-muted">
                {counts.all === 0
                  ? "아직 올린 결재가 없어요."
                  : "해당 상태의 결재가 없어요."}
              </p>
            </div>
          )}
        </div>
      </div>

      <NewApprovalDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          refresh();
          setNewOpen(false);
        }}
      />
    </div>
  );
}

// ─────────────── ScopeButton ───────────────

function ScopeButton({
  active,
  onClick,
  count,
  countTone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  countTone: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
        active ? "bg-card-hover text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {children}
      <span
        className={`inline-flex size-5 items-center justify-center rounded-full text-xs font-bold tabular-nums ${countTone}`}
      >
        {count}
      </span>
    </button>
  );
}

// ─────────────── RequestListCard ───────────────

function RequestListCard({
  approvals,
  selectedId,
  onSelect,
  isLoading,
  isError,
  error,
}: {
  approvals: ApprovalOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">내 신청 목록</h2>
        <span className="text-xs text-muted tabular-nums">
          {approvals.length}건
        </span>
      </div>
      {isLoading ? (
        <ul className="divide-y divide-line">
          {[0, 1, 2].map((i) => (
            <li key={i} className="animate-pulse px-5 py-4">
              <div className="h-3 w-1/3 rounded bg-card-hover" />
              <div className="mt-2 h-4 w-2/3 rounded bg-card-hover" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p className="border-t border-line px-5 py-10 text-center text-sm text-red-300">
          {getV2ErrorMessage(error)}
        </p>
      ) : approvals.length === 0 ? (
        <p className="border-t border-line px-5 py-10 text-center text-sm text-muted">
          해당 상태의 결재가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {approvals.map((a) => {
            const meta = kindMeta(a.kind);
            const KindIcon = meta.icon;
            const active = selectedId === a.id;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(a.id)}
                  className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                    active ? "bg-primary/15" : "hover:bg-card-hover"
                  }`}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md ${meta.bg}`}
                  >
                    <KindIcon className={`size-5 ${meta.text}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted">
                        {a.kind}
                      </span>
                      <StatusChip status={a.status} />
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-fg">
                      {a.title}
                    </p>
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      {formatDateTime(a.createdAt)}
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

function StatusChip({ status }: { status: ApprovalStatus }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

// ─────────────── DetailPanel ───────────────

function DetailPanel({
  approval,
  employeeLookup,
  meId,
  onChanged,
}: {
  approval: ApprovalOut;
  employeeLookup: Map<
    string,
    { name: string; avatarColor: string | undefined }
  >;
  meId: string | null;
  onChanged: () => void;
}) {
  const [comment, setComment] = useState("");
  const meta = kindMeta(approval.kind);
  const KindIcon = meta.icon;

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawApproval(approval.id),
    onSuccess: onChanged,
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => commentApproval(approval.id, { body }),
    onSuccess: () => {
      setComment("");
      onChanged();
    },
  });

  function submitComment() {
    const body = comment.trim();
    if (!body) return;
    commentMutation.mutate(body);
  }

  const canWithdraw =
    approval.status === "IN_PROGRESS" && approval.requesterId === meId;
  const requester = employeeLookup.get(approval.requesterId);

  return (
    <div className="rounded-lg border border-line bg-card">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div className="flex items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-md ${meta.bg}`}
          >
            <KindIcon className={`size-5 ${meta.text}`} />
          </span>
          <div>
            <p className="text-xs text-muted">{approval.kind}</p>
            <h2 className="mt-0.5 text-lg font-bold text-fg">
              {approval.title}
            </h2>
          </div>
        </div>
        <StatusChip status={approval.status} />
      </div>

      {/* 메타 grid */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-b border-line px-6 py-5 sm:grid-cols-2">
        <Field label="신청자">{requester?.name ?? "알 수 없음"}</Field>
        <Field label="신청일">
          <span className="tabular-nums">
            {formatDateTime(approval.createdAt)}
          </span>
        </Field>
        {approval.startDate && (
          <Field label="시작">
            <span className="tabular-nums">{approval.startDate}</span>
          </Field>
        )}
        {approval.endDate && (
          <Field label="종료">
            <span className="tabular-nums">{approval.endDate}</span>
          </Field>
        )}
        {approval.place && <Field label="목적지">{approval.place}</Field>}
        {approval.amount != null && (
          <Field label="금액" wide>
            <span className="text-base font-bold tabular-nums text-fg">
              {formatWon(approval.amount)}
            </span>
          </Field>
        )}
      </div>

      {/* 내용 */}
      <div className="border-b border-line px-6 py-5">
        <p className="text-xs font-semibold text-muted">내용</p>
        <pre className="mt-2 rounded-md border border-line bg-card-hover px-5 py-4 font-sans text-sm whitespace-pre-wrap text-fg">
          {approval.content}
        </pre>
      </div>

      {/* 결재선 */}
      <div className="border-b border-line px-6 py-5">
        <p className="text-xs font-semibold text-muted">결재선</p>
        <ul className="mt-3 space-y-2">
          {approval.steps.map((step, i) => (
            <ApproverRow
              key={step.approverId + i}
              order={i + 1}
              step={step}
              employee={employeeLookup.get(step.approverId)}
              current={step.approverId === approval.currentApproverId}
            />
          ))}
        </ul>
      </div>

      {/* 댓글 */}
      <div className="border-b border-line px-6 py-5">
        <p className="text-xs font-semibold text-fg">댓글</p>
        {approval.comments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 댓글이 없어요.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {approval.comments.map((c, i) => {
              const author = employeeLookup.get(c.authorId);
              return (
                <li
                  key={i}
                  className="rounded-md border border-line bg-card-hover p-3"
                >
                  <div className="flex items-center gap-2">
                    <MiniAvatar
                      name={author?.name ?? "?"}
                      tone={avatarTone(author?.avatarColor)}
                    />
                    <span className="text-sm font-semibold text-fg">
                      {author?.name ?? "알 수 없음"}
                    </span>
                    <span className="ml-auto text-xs text-muted tabular-nums">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-fg whitespace-pre-wrap">
                    {c.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex items-start gap-2">
          <div className="relative flex-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="맥락이나 추가 질문을 남겨보세요 (⌘/Ctrl+Enter 로 등록)"
              disabled={commentMutation.isPending}
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2 pr-14 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none disabled:opacity-40"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submitComment();
                }
              }}
            />
            <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted tabular-nums">
              {comment.length}/2000
            </span>
          </div>
          <button
            type="button"
            disabled={
              comment.trim().length === 0 || commentMutation.isPending
            }
            onClick={submitComment}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {commentMutation.isPending ? "등록 중…" : "등록"}
          </button>
        </div>
        {commentMutation.isError && (
          <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {getV2ErrorMessage(commentMutation.error)}
          </p>
        )}
      </div>

      {/* 하단 액션 */}
      {canWithdraw && (
        <div className="flex items-center justify-start gap-2 px-6 py-5">
          <button
            type="button"
            onClick={() => {
              if (!confirm("결재를 회수할까요? 진행 중이던 결재가 종료됩니다."))
                return;
              withdrawMutation.mutate();
            }}
            disabled={withdrawMutation.isPending}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {withdrawMutation.isPending ? "회수 중…" : "결재 회수"}
          </button>
          {withdrawMutation.isError && (
            <p className="flex items-center gap-1.5 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-3.5" />
              {getV2ErrorMessage(withdrawMutation.error)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm text-fg">{children}</p>
    </div>
  );
}

function ApproverRow({
  order,
  step,
  employee,
  current,
}: {
  order: number;
  step: ApprovalStep;
  employee: { name: string; avatarColor: string | undefined } | undefined;
  current: boolean;
}) {
  const statusStyle: Record<typeof step.status, string> = {
    PENDING: "bg-yellow-400/15 text-yellow-400",
    APPROVED: "bg-emerald-500/15 text-emerald-400",
    REJECTED: "bg-red-500/15 text-red-400",
  };
  const label =
    step.status === "PENDING"
      ? current
        ? "차례"
        : "대기"
      : step.status === "APPROVED"
        ? "승인"
        : "반려";
  return (
    <li className="flex items-start gap-3 rounded-md border border-line bg-card-hover px-4 py-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-fg tabular-nums">
        {order}
      </span>
      <MiniAvatar
        name={employee?.name ?? "?"}
        tone={avatarTone(employee?.avatarColor)}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-fg">
          {employee?.name ?? "알 수 없음"}
        </p>
        {step.comment && (
          <p className="mt-1 text-sm text-muted whitespace-pre-wrap">
            {step.comment}
          </p>
        )}
        {step.actedAt && (
          <p className="mt-1 text-xs text-muted tabular-nums">
            {formatDateTime(step.actedAt)}
          </p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[step.status]}`}
      >
        {label}
      </span>
    </li>
  );
}

function MiniAvatar({ name, tone }: { name: string; tone: string }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${tone}`}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  );
}

// ISO → "2026. 7. 27. 오전 11:00"
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${ampm} ${String(h12).padStart(2, "0")}:${m}`;
}

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
