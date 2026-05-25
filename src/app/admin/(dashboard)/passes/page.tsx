"use client";

import { PageTitle } from "../PageTitle";
import { useEffect, useState, type ComponentType } from "react";
import {
  BanknotesIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  LockClosedIcon,
  ShoppingBagIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import {
  createPass,
  deletePass,
  getAdminPasses,
  updatePass,
  type PassInput,
  type PassType,
} from "@/lib/api/passes";
import { getAdminMembers } from "@/lib/api/members";
import { getAdminPtApplications } from "@/lib/api/ptApplications";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { Select } from "@/components/Select";
import { TableMessage } from "@/components/Table";
import { formatWon } from "@/lib/format";
import type { Pass } from "@/lib/api/types";
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

export default function AdminPassesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  const me = meQuery.data;
  const isSuper = me?.role === "SUPER_ADMIN";

  const [activeType, setActiveType] = useState<PassType>("membership");
  const [selectedBranch, setSelectedBranch] = useState("");
  // null=닫힘, "new"=등록, Pass=수정
  const [formTarget, setFormTarget] = useState<Pass | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pass | null>(null);

  // SUPER_ADMIN: 지점 목록 로드되면 첫 지점을 기본 선택
  useEffect(() => {
    if (isSuper && !selectedBranch && branchesQuery.data?.length) {
      setSelectedBranch(branchesQuery.data[0].id);
    }
  }, [isSuper, selectedBranch, branchesQuery.data]);

  // FC는 본인 지점 고정, SUPER_ADMIN은 선택한 지점
  const branchId = isSuper ? selectedBranch : (me?.branch_id ?? "");
  const typeLabel = TABS.find((t) => t.type === activeType)!.label;

  const passesQuery = useQuery({
    queryKey: ["admin", "passes", activeType, branchId],
    queryFn: () => getAdminPasses(activeType, branchId),
    enabled: !!branchId,
  });

  // 카드의 "이용자 N명" 표시용 — 대시보드와 같은 캐시키
  const membersQuery = useQuery({
    queryKey: ["admin", "members", "all"],
    queryFn: () => getAdminMembers(),
  });
  const ptApplicationsQuery = useQuery({
    queryKey: ["admin", "pt-applications", "all"],
    queryFn: () => getAdminPtApplications(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["admin", "passes", activeType, branchId],
    });

  const createMutation = useMutation({
    mutationFn: (v: PassInput) =>
      createPass(activeType, { branch_id: branchId, ...v }),
    onSuccess: () => {
      toast.success(`${typeLabel}이(가) 등록되었습니다.`);
      setFormTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; values: PassInput }) =>
      updatePass(activeType, args.id, args.values),
    onSuccess: () => {
      toast.success(`${typeLabel}이(가) 수정되었습니다.`);
      setFormTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePass(activeType, id),
    onSuccess: () => {
      toast.success(`${typeLabel}이(가) 삭제되었습니다.`);
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const passes = passesQuery.data ?? [];
  const editing = formTarget && formTarget !== "new" ? formTarget : null;

  // 현재 활성 탭의 상품을 회원/PT 신청 중 몇 건이 선택했는지
  function userCountFor(passId: string): number {
    const allMembers = membersQuery.data ?? [];
    const allPts = ptApplicationsQuery.data ?? [];
    if (activeType === "membership")
      return allMembers.filter((m) => m.membership_pass_id === passId).length;
    if (activeType === "pt")
      return allPts.filter((x) => x.pt_pass_id === passId).length;
    if (activeType === "locker")
      return allMembers.filter((m) => m.locker_pass_id === passId).length;
    return allMembers.filter((m) => m.clothes_pass_id === passId).length;
  }

  function submitForm(values: PassInput) {
    if (editing) updateMutation.mutate({ id: editing.id, values });
    else createMutation.mutate(values);
  }

  return (
    <div>
      <PageTitle title="상품 관리" />
      <p className="mt-1 text-sm text-gray-500">
        지점별 회원권·수강권·락커·운동복 상품을 관리합니다.
      </p>

      {isSuper && (
        <div className="mt-5 max-w-xs">
          <Select
            id="branch"
            label="지점"
            icon={BuildingOffice2Icon}
            options={(branchesQuery.data ?? []).map((b) => ({
              value: b.id,
              label: b.name,
            }))}
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          />
        </div>
      )}

      <div className="mt-6 flex items-end justify-between border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => setActiveType(t.type)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
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
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          disabled={!branchId}
          className="mb-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {typeLabel} 등록
        </button>
      </div>

      <div className="mt-4">
        {!branchId ? (
          <TableMessage>지점을 선택해 주세요.</TableMessage>
        ) : passesQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : passesQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : passes.length === 0 ? (
          <TableMessage>등록된 {typeLabel}이(가) 없습니다.</TableMessage>
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
                  <div>
                    <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <BanknotesIcon className="size-3.5" />
                      현금가
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {formatWon(p.cash_price)}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <CreditCardIcon className="size-3.5" />
                      카드가
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {formatWon(p.card_price)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  이용자{" "}
                  <span className="font-semibold text-gray-900">
                    {userCountFor(p.id)}명
                  </span>
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <PassFormDialog
        key={typeof formTarget === "string" ? "new" : (formTarget?.id ?? "closed")}
        open={formTarget !== null}
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
            ? `'${deleteTarget.name}'을(를) 삭제하시겠습니까?`
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
