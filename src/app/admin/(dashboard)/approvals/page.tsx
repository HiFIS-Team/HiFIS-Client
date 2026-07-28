"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import {
  ArrowPathIcon,
  BanknotesIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";
import { NewApprovalDialog } from "./NewApprovalDialog";

// 전자결재 페이지 — 좌 신청 목록 + 우 상세.
// mock. 실제 결재 워크플로우/API/알림은 다음 스텝.

// ─────────────── mock ───────────────

type ApprovalKind = "출장 신청" | "구매 요청" | "지출결의";
type ApprovalStatus = "진행 중" | "승인 완료" | "반려";

interface Approver {
  order: number;
  name: string;
  position: string;
  avatarTone: string;
  comment?: string;
  time?: string;
  status: "승인" | "대기" | "반려";
}
interface CommentItem {
  author: string;
  authorTone: string;
  text: string;
  time: string;
}
interface Approval {
  id: string;
  kind: ApprovalKind;
  title: string;
  status: ApprovalStatus;
  requester: { name: string; position: string; team: string };
  requestedAt: string;
  startAt?: string;
  endAt?: string;
  amount?: number;
  content: string;
  approvers: Approver[];
  comments: CommentItem[];
}

const KIND_META: Record<
  ApprovalKind,
  { icon: ComponentType<SVGProps<SVGSVGElement>>; bg: string; text: string }
> = {
  "출장 신청": {
    icon: PaperAirplaneIcon,
    bg: "bg-primary/15",
    text: "text-primary",
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
};

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  "진행 중": "bg-yellow-400/15 text-yellow-400",
  "승인 완료": "bg-emerald-500/15 text-emerald-400",
  반려: "bg-red-500/15 text-red-400",
};

const APPROVER_STATUS: Record<Approver["status"], string> = {
  승인: "bg-emerald-500/15 text-emerald-400",
  대기: "bg-yellow-400/15 text-yellow-400",
  반려: "bg-red-500/15 text-red-400",
};

const APPROVALS: Approval[] = [
  {
    id: "a1",
    kind: "출장 신청",
    title: "부산 KT 본사 미팅 동행 — 5/15 ~ 5/16",
    status: "진행 중",
    requester: { name: "김데모", position: "사원", team: "프로덕트팀" },
    requestedAt: "2026. 7. 27. 오전 11:00:00",
    startAt: "2026. 8. 4.",
    endAt: "2026. 8. 5.",
    amount: 320000,
    content: `[목적]
KT 본사와 v2 베타 도입 협의 (의사결정자 미팅).

[일정]
- 5/15 (수) 09:00 김포 → 김해 / 11:00 KT 본사 미팅 / 18:00 호텔 체크인
- 5/16 (목) 10:00 후속 미팅 / 14:00 김해 → 김포 복귀

[비용 추산]
- 항공 왕복 (김포-김해, 평일): 180,000
- 호텔 1박 (이비스 부산역): 110,000
- 식비 / 교통 (현지): 30,000
- 합계: 320,000원

[기대 효과]
연간 계약 규모 약 4억원 / 협업 마일스톤 합의.`,
    approvers: [
      {
        order: 1,
        name: "이앨리스",
        position: "리드",
        avatarTone: "bg-emerald-500",
        comment: '"출장 일정 확인했습니다. 자료 준비 잘 부탁드려요."',
        time: "2026. 7. 27. 오후 2:00:00",
        status: "승인",
      },
      {
        order: 2,
        name: "임도훈",
        position: "이사",
        avatarTone: "bg-violet-500",
        status: "대기",
      },
    ],
    comments: [],
  },
  {
    id: "a2",
    kind: "구매 요청",
    title: "재택 근무 셋업 — 무선 키보드 / 마우스",
    status: "승인 완료",
    requester: { name: "김데모", position: "사원", team: "프로덕트팀" },
    requestedAt: "2026. 7. 25. 오후 3:20:00",
    amount: 180000,
    content: "재택 근무 환경 개선 목적.",
    approvers: [
      { order: 1, name: "이앨리스", position: "리드", avatarTone: "bg-emerald-500", status: "승인" },
      { order: 2, name: "임도훈", position: "이사", avatarTone: "bg-violet-500", status: "승인" },
    ],
    comments: [],
  },
  {
    id: "a3",
    kind: "지출결의",
    title: "외부 컨퍼런스 참가 — Next.js Conf 2026",
    status: "반려",
    requester: { name: "김데모", position: "사원", team: "프로덕트팀" },
    requestedAt: "2026. 7. 23. 오후 5:00:00",
    amount: 450000,
    content: "컨퍼런스 티켓 + 도서 세트.",
    approvers: [
      { order: 1, name: "이앨리스", position: "리드", avatarTone: "bg-emerald-500", status: "승인" },
      { order: 2, name: "임도훈", position: "이사", avatarTone: "bg-violet-500", status: "반려" },
    ],
    comments: [],
  },
];

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

// ─────────────── page ───────────────

// 내 신청 하위 필터 — 상태별.
type StatusFilter = "approved" | "waiting" | "rejected";
const FILTER_TO_STATUS: Record<StatusFilter, ApprovalStatus> = {
  approved: "승인 완료",
  waiting: "진행 중",
  rejected: "반려",
};

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<StatusFilter>("waiting");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = APPROVALS.filter(
    (a) => a.status === FILTER_TO_STATUS[filter],
  );
  const counts: Record<StatusFilter, number> = {
    approved: APPROVALS.filter((a) => a.status === "승인 완료").length,
    waiting: APPROVALS.filter((a) => a.status === "진행 중").length,
    rejected: APPROVALS.filter((a) => a.status === "반려").length,
  };

  // 필터 바뀌면 선택 초기화 (첫 항목 or null)
  const [selectedId, setSelectedId] = useState<string | null>(APPROVALS[0].id);
  const inFilteredSet = filtered.some((a) => a.id === selectedId);
  const effectiveId = inFilteredSet
    ? selectedId
    : filtered[0]?.id ?? null;
  const selected = effectiveId
    ? APPROVALS.find((a) => a.id === effectiveId) ?? null
    : null;

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
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon className="size-4" />
          </button>

          {/* 내 신청 상태별 세그먼트 (승인 / 대기 / 반려) */}
          <div className="inline-flex rounded-full border border-line p-0.5">
            <ScopeButton
              active={filter === "approved"}
              onClick={() => setFilter("approved")}
              count={counts.approved}
              countTone="bg-emerald-500/20 text-emerald-400"
            >
              승인
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

      {/* 본문 : lg 에서 좌 1/3 · 우 2/3 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <RequestListCard
            approvals={filtered}
            selectedId={effectiveId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <DetailPanel approval={selected} />
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-card p-8 text-center">
              <p className="text-sm text-muted">
                해당 상태의 결재가 없어요.
              </p>
            </div>
          )}
        </div>
      </div>

      <NewApprovalDialog open={newOpen} onClose={() => setNewOpen(false)} />
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
}: {
  approvals: Approval[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">내 신청 목록</h2>
        <span className="text-xs text-muted tabular-nums">
          {approvals.length}건
        </span>
      </div>
      {approvals.length === 0 ? (
        <p className="border-t border-line px-5 py-10 text-center text-sm text-muted">
          해당 상태의 결재가 없어요.
        </p>
      ) : (
      <ul className="divide-y divide-line">
        {approvals.map((a) => {
          const kind = KIND_META[a.kind];
          const KindIcon = kind.icon;
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
                  className={`flex size-9 shrink-0 items-center justify-center rounded-md ${kind.bg}`}
                >
                  <KindIcon className={`size-5 ${kind.text}`} />
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
                    내가 요청 · {a.requestedAt.split(" ").slice(0, 4).join(" ")}
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
      {status}
    </span>
  );
}

// ─────────────── DetailPanel ───────────────

function DetailPanel({ approval }: { approval: Approval }) {
  const [comment, setComment] = useState("");
  const kind = KIND_META[approval.kind];
  const KindIcon = kind.icon;

  return (
    <div className="rounded-lg border border-line bg-card">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div className="flex items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-md ${kind.bg}`}
          >
            <KindIcon className={`size-5 ${kind.text}`} />
          </span>
          <div>
            <p className="text-xs text-muted">{approval.kind}</p>
            <h2 className="mt-0.5 text-lg font-bold text-fg">{approval.title}</h2>
          </div>
        </div>
        <StatusChip status={approval.status} />
      </div>

      {/* 메타 grid */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-b border-line px-6 py-5 sm:grid-cols-2">
        <Field label="신청자">
          {approval.requester.name} · {approval.requester.position} ·{" "}
          {approval.requester.team}
        </Field>
        <Field label="신청일">
          <span className="tabular-nums">{approval.requestedAt}</span>
        </Field>
        {approval.startAt && (
          <Field label="시작">
            <span className="tabular-nums">{approval.startAt}</span>
          </Field>
        )}
        {approval.endAt && (
          <Field label="종료">
            <span className="tabular-nums">{approval.endAt}</span>
          </Field>
        )}
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
          {approval.approvers.map((ap) => (
            <ApproverRow key={ap.order} approver={ap} />
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
            {approval.comments.map((c, i) => (
              <li key={i} className="rounded-md border border-line bg-card-hover p-3">
                <div className="flex items-center gap-2">
                  <MiniAvatar name={c.author} tone={c.authorTone} />
                  <span className="text-sm font-semibold text-fg">{c.author}</span>
                  <span className="ml-auto text-xs text-muted tabular-nums">
                    {c.time}
                  </span>
                </div>
                <p className="mt-2 text-sm text-fg">{c.text}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-start gap-2">
          <div className="relative flex-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="반려 사유에 대한 맥락이나 추가 질문을 남겨보세요  (⌘/Ctrl+Enter 로 등록)"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2 pr-14 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  // TODO: 등록 로직 (mock)
                  setComment("");
                }
              }}
            />
            <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted tabular-nums">
              {comment.length}/2000
            </span>
          </div>
          <button
            type="button"
            disabled={comment.trim().length === 0}
            onClick={() => setComment("")}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:opacity-40"
          >
            등록
          </button>
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="flex items-center justify-start px-6 py-5">
        <button
          type="button"
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
        >
          결재 취소
        </button>
      </div>
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

function ApproverRow({ approver }: { approver: Approver }) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-line bg-card-hover px-4 py-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-fg tabular-nums">
        {approver.order}
      </span>
      <MiniAvatar name={approver.name} tone={approver.avatarTone} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-fg">
          {approver.name} · {approver.position}
        </p>
        {approver.comment && (
          <p className="mt-1 text-sm text-muted">{approver.comment}</p>
        )}
        {approver.time && (
          <p className="mt-1 text-xs text-muted tabular-nums">
            {approver.time}
          </p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${APPROVER_STATUS[approver.status]}`}
      >
        {approver.status}
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
