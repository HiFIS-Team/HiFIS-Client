"use client";

import { PageTitle } from "../PageTitle";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  BanknotesIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  LockClosedIcon,
  ShoppingBagIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
import {
  createPass,
  deletePass,
  getAdminPasses,
  updatePass,
  type PassInput,
  type PassType,
} from "@/lib/api/passes";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { Select } from "@/components/Select";
import { TableMessage, TableSkeleton } from "@/components/Table";
import { formatWon, josaEulReul, josaIGa } from "@/lib/format";
import type { Pass } from "@/lib/api/types";
import { sortPassesForUI, passDuration } from "@/lib/passDuration";
import { PassFormDialog } from "./PassFormDialog";

const TABS: {
  type: PassType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { type: "membership", label: "회원권", icon: TicketIcon },
  { type: "pt", label: "수강권", icon: BoltIcon },
  { type: "locker", label: "락커", icon: LockClosedIcon },
  { type: "clothes", label: "운동복", icon: ShoppingBagIcon },
];

// 카드 칩에 띄울 기간 — 채워진 컬럼 기준 단위 ("3개월" / "7일" / "3시간"),
// 셋 다 null 이면 이름에서 추출 (passDuration fallback). 추출도 실패하면 "기간 미지정".
function formatPassDuration(p: Pass): string {
  const d = passDuration(p);
  if (!d) return "기간 미지정";
  if ("months" in d) return `${d.months}개월`;
  if ("days" in d) return `${d.days}일`;
  return `${d.hours}시간`;
}

// 카드 하단 정보 칩 — 이용자 수·기간·락커/운동복 제공 모두 같은 디자인.
// accent 면 보라(활성 옵션), 아니면 회색(메타).
function Chip({
  children,
  accent = false,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        accent ? "bg-violet-50 text-primary" : "bg-gray-50 text-gray-600"
      }`}
    >
      {children}
    </span>
  );
}

export default function AdminPassesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId } = useBranch();
  const branchId = selectedBranchId ?? "";

  const [activeType, setActiveType] = useState<PassType>("membership");
  // null=닫힘, "new"=등록, Pass=수정
  const [formTarget, setFormTarget] = useState<Pass | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pass | null>(null);
  const typeLabel = TABS.find((t) => t.type === activeType)!.label;

  const passesQuery = useQuery({
    queryKey: ["admin", "passes", activeType, branchId],
    queryFn: () => getAdminPasses(activeType, branchId),
    enabled: !!branchId,
    // 탭(회원권/수강권/락커/운동복) 전환 시 깜빡임 방지
    placeholderData: keepPreviousData,
  });

  // 카드의 "이용자 N명" 표시용 — 대시보드 summary 의 by_membership_pass / by_pt_pass 사용
  // SUPER_ADMIN: 선택한 지점, FC: 토큰 기준 자동 분기 (branchId 가 빈 문자열이면 전체)
  const summaryQuery = useQuery({
    queryKey: ["admin", "dashboard-summary", branchId || "all"],
    queryFn: () => getDashboardSummary(branchId || undefined),
    enabled: !!branchId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["admin", "passes", activeType, branchId],
    });

  const createMutation = useMutation({
    mutationFn: (v: PassInput) =>
      createPass(activeType, { branch_id: branchId, ...v }),
    onSuccess: () => {
      toast.success(`${typeLabel}${josaIGa(typeLabel)} 등록되었습니다.`);
      setFormTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; values: PassInput }) =>
      updatePass(activeType, args.id, args.values),
    onSuccess: (updated) => {
      toast.success(`${typeLabel}${josaIGa(typeLabel)} 수정되었습니다.`);
      setFormTarget(null);
      // invalidate 의 refetch 가 끝나기 전 사용자가 같은 카드 "수정" 을 다시
      // 누를 수 있으므로, 서버 응답으로 캐시를 동기 갱신해 stale 값이 모달에
      // 다시 뜨는 것을 막는다 (특히 provides_locker / provides_clothes 토글)
      queryClient.setQueryData<Pass[]>(
        ["admin", "passes", activeType, branchId],
        (old) => old?.map((p) => (p.id === updated.id ? updated : p)),
      );
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePass(activeType, id),
    onSuccess: () => {
      toast.success(`${typeLabel}${josaIGa(typeLabel)} 삭제되었습니다.`);
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // 표시 정렬 — 4종 모두 신청서 Select 와 동일 (sortPassesForUI):
  // 카테고리(일반·학생·제휴 등) → 기간 → 가격 → 이름. "락커 3개월" 같이 이름에 기간이
  // 들어있는 락커·운동복도 자연스럽게 기간 오름차순으로 정렬됨.
  const passes = sortPassesForUI(passesQuery.data ?? []);
  const editing = formTarget && formTarget !== "new" ? formTarget : null;

  // 현재 활성 탭의 상품을 회원/PT 신청 중 몇 건이 선택했는지 — summary 에서 직접 조회
  function userCountFor(passId: string): number {
    const summary = summaryQuery.data;
    if (!summary) return 0;
    if (activeType === "membership")
      return summary.members.by_membership_pass[passId] ?? 0;
    if (activeType === "pt")
      return summary.pt_applications.by_pt_pass[passId] ?? 0;
    // 락커·운동복은 summary 에 별도 카운트가 없음 — 우선 0 노출 (필요 시 백엔드 확장)
    return 0;
  }

  function submitForm(values: PassInput) {
    if (editing) updateMutation.mutate({ id: editing.id, values });
    else createMutation.mutate(values);
  }

  return (
    <div>
      <PageTitle title="상품 관리" />
      <p className="mt-1 text-sm text-gray-500 lg:hidden">
        지점별 회원권·수강권·락커·운동복 상품을 관리합니다.
      </p>

      {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 별도 셀렉터 없음. */}

      {/* 모바일 전용 — 좌측 정렬, 자체 행 */}
      <div className="mt-4 flex justify-start lg:hidden">
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          disabled={!branchId}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {typeLabel} 등록
        </button>
      </div>

      {/* 탭 행 — 상품별 판매와 동일하게 4개 flex-1 균등 분할 (모바일 가로 스크롤 X).
          데스크탑은 탭 영역 우측에 등록 버튼이 함께. */}
      <div className="mt-4 flex items-end border-b border-gray-200 lg:mt-6 lg:gap-3">
        <div className="flex flex-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => setActiveType(t.type)}
                className={`-mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-sm font-medium whitespace-nowrap sm:px-4 ${
                  activeType === t.type
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        {/* 데스크탑 전용 — 탭 옆 우측 */}
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          disabled={!branchId}
          className="mb-2 hidden shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-primary-hover disabled:opacity-60 lg:inline-block"
        >
          {typeLabel} 등록
        </button>
      </div>

      <div className="mt-4">
        {!branchId ? (
          <TableMessage>지점을 선택해 주세요.</TableMessage>
        ) : passesQuery.isLoading ? (
          <TableSkeleton />
        ) : passesQuery.isError ? (
          <TableMessage variant="error">목록을 불러오지 못했습니다.</TableMessage>
        ) : passes.length === 0 ? (
          <TableMessage>등록된 {typeLabel}{josaIGa(typeLabel)} 없습니다.</TableMessage>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {passes.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{p.name}</h2>
                  <div className="flex shrink-0 gap-2">
                    <RowActionButton onClick={() => setFormTarget(p)}>
                      수정
                    </RowActionButton>
                    <RowActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(p)}
                    >
                      삭제
                    </RowActionButton>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 px-3 py-4 text-center">
                  <div className="min-w-0">
                    <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <BanknotesIcon className="size-3.5" />
                      현금가
                    </p>
                    <p className="mt-1 truncate text-base font-bold tabular-nums text-gray-900">
                      {formatWon(p.cash_price)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <CreditCardIcon className="size-3.5" />
                      카드가
                    </p>
                    <p className="mt-1 truncate text-base font-bold tabular-nums text-gray-900">
                      {formatWon(p.card_price)}
                    </p>
                  </div>
                </div>
                {/* 카드 하단 정보 칩 — 같은 디자인의 chip 들을 가운데 정렬로 한 줄에.
                    이용자 N명 · N개월/일/시간 · 락커 제공 · 운동복 제공.
                    기간은 채워진 컬럼 기준 단위로 표시, 셋 다 비어있으면 이름에서
                    추출 fallback (passDuration 헬퍼 — 신청서 계산과 동일).
                    제공 칩은 off 면 회색, 자기 자신 종류(락커 카드의 "락커 제공") 는 숨김. */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  <Chip>이용자 {userCountFor(p.id)}명</Chip>
                  <Chip>{formatPassDuration(p)}</Chip>
                  {activeType !== "locker" && (
                    <Chip accent={!!p.provides_locker}>락커 제공</Chip>
                  )}
                  {activeType !== "clothes" && (
                    <Chip accent={!!p.provides_clothes}>운동복 제공</Chip>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <PassFormDialog
        key={typeof formTarget === "string" ? "new" : (formTarget?.id ?? "closed")}
        open={formTarget !== null}
        type={activeType}
        title={editing ? `${typeLabel} 수정` : `${typeLabel} 등록`}
        initial={editing}
        loading={createMutation.isPending || updateMutation.isPending}
        onSubmit={submitForm}
        onCancel={() => setFormTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        danger
        title={`${typeLabel} 삭제`}
        message={
          deleteTarget
            ? `'${deleteTarget.name}'${josaEulReul(deleteTarget.name)} 삭제하시겠습니까?`
            : ""
        }
        confirmLabel="삭제"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
