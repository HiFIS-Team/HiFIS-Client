"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import {
  createBranch,
  getAdminBranches,
  updateBranch,
  type BranchInput,
} from "@/lib/api/branches";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { Td, Th, TableMessage } from "@/components/Table";
import type { Branch } from "@/lib/api/types";
import { BranchFormDialog } from "./BranchFormDialog";

// URL 셀 — 값이 있으면 새 탭 링크, 없으면 "-"
function LinkCell({ url }: { url: string | null }) {
  if (!url) return <span className="text-gray-400">-</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      링크
    </a>
  );
}

export default function AdminBranchesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  // null=닫힘, "new"=등록, Branch=수정
  const [formTarget, setFormTarget] = useState<Branch | "new" | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: getAdminBranches,
    enabled: isSuper,
  });

  // 지점 목록은 공개 ["branches"] 캐시도 함께 갱신
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  };

  const createMutation = useMutation({
    mutationFn: (v: BranchInput) => createBranch(v),
    onSuccess: () => {
      toast.success("지점이 등록되었습니다.");
      setFormTarget(null);
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const updateMutation = useMutation({
    mutationFn: (args: { id: string; values: BranchInput }) =>
      updateBranch(args.id, args.values),
    onSuccess: () => {
      toast.success("지점 정보가 수정되었습니다.");
      setFormTarget(null);
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // 권한 가드 — FC는 접근 불가
  if (meQuery.data && !isSuper) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">지점 관리</h1>
        <p className="mt-2 text-gray-600">대표 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const branches = branchesQuery.data ?? [];
  const editing = formTarget && formTarget !== "new" ? formTarget : null;

  function submitForm(values: BranchInput) {
    if (editing) updateMutation.mutate({ id: editing.id, values });
    else createMutation.mutate(values);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">지점 관리</h1>
      <p className="mt-1 text-sm text-gray-500">
        피트니스스타 지점을 등록·수정합니다.
      </p>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          지점 등록
        </button>
      </div>

      <div className="mt-3">
        {branchesQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : branchesQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : branches.length === 0 ? (
          <TableMessage>등록된 지점이 없습니다.</TableMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>지점명</Th>
                  <Th>전화번호</Th>
                  <Th>카카오</Th>
                  <Th>네이버 플레이스</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {branches.map((b) => (
                  <tr key={b.id} className="text-gray-800">
                    <Td className="font-medium">{b.name}</Td>
                    <Td>{b.phone}</Td>
                    <Td>
                      <LinkCell url={b.kakao_url} />
                    </Td>
                    <Td>
                      <LinkCell url={b.naver_place_url} />
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setFormTarget(b)}
                        className="font-medium text-primary hover:text-primary-hover"
                      >
                        수정
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BranchFormDialog
        key={typeof formTarget === "string" ? "new" : (formTarget?.id ?? "closed")}
        open={formTarget !== null}
        title={editing ? "지점 수정" : "지점 등록"}
        initial={editing}
        loading={createMutation.isPending || updateMutation.isPending}
        onSubmit={submitForm}
        onCancel={() => setFormTarget(null)}
      />
    </div>
  );
}
