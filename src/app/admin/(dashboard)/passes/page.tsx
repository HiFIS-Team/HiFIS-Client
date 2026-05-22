"use client";

import { useEffect, useState } from "react";
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
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Select } from "@/components/Select";
import { Td, Th, TableMessage } from "@/components/Table";
import { formatWon } from "@/lib/format";
import type { Pass } from "@/lib/api/types";
import { PassFormDialog } from "./PassFormDialog";

const TABS: { type: PassType; label: string }[] = [
  { type: "membership", label: "회원권" },
  { type: "pt", label: "수강권" },
  { type: "locker", label: "락커" },
  { type: "clothes", label: "운동복" },
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

  function submitForm(values: PassInput) {
    if (editing) updateMutation.mutate({ id: editing.id, values });
    else createMutation.mutate(values);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
      <p className="mt-1 text-sm text-gray-500">
        지점별 회원권·수강권·락커·운동복 상품을 관리합니다.
      </p>

      {isSuper && (
        <div className="mt-5 max-w-xs">
          <Select
            id="branch"
            label="지점"
            options={(branchesQuery.data ?? []).map((b) => ({
              value: b.id,
              label: b.name,
            }))}
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          />
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setActiveType(t.type)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              activeType === t.type
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          disabled={!branchId}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {typeLabel} 등록
        </button>
      </div>

      <div className="mt-3">
        {!branchId ? (
          <TableMessage>지점을 선택해 주세요.</TableMessage>
        ) : passesQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : passesQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : passes.length === 0 ? (
          <TableMessage>등록된 {typeLabel}이(가) 없습니다.</TableMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>상품명</Th>
                  <Th>현금가</Th>
                  <Th>카드가</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {passes.map((p) => (
                  <tr key={p.id} className="text-gray-800">
                    <Td className="font-medium">{p.name}</Td>
                    <Td>{formatWon(p.cash_price)}</Td>
                    <Td>{formatWon(p.card_price)}</Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setFormTarget(p)}
                        className="font-medium text-primary hover:text-primary-hover"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="ml-4 font-medium text-red-600 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
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
