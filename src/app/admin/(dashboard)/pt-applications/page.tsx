"use client";

import { PageTitle } from "../PageTitle";
import { useEffect, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import {
  deletePtApplication,
  getAdminPtApplications,
} from "@/lib/api/ptApplications";
import { getPtPasses } from "@/lib/api/passes";
import { cancelHold } from "@/lib/api/holds";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { StatusBadge, STATUS_FILTERS } from "@/components/StatusBadge";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { Td, Th, TableMessage } from "@/components/Table";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { PTApplication } from "@/lib/api/types";
import { HoldDialog } from "../HoldDialog";
import { PtDetailDialog } from "./PtDetailDialog";
import { PtEditDialog } from "./PtEditDialog";

export default function AdminPtApplicationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<PTApplication | null>(null);
  const [editTarget, setEditTarget] = useState<PTApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<PTApplication | null>(null);
  const [holdTarget, setHoldTarget] = useState<PTApplication | null>(null);
  const [cancelHoldTarget, setCancelHoldTarget] = useState<PTApplication | null>(
    null,
  );

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  // 이용 기간 대신 수강권명을 표시 — 지점별 PT 수강권 목록을 모아 id→이름 맵 구성
  const passQueries = useQueries({
    queries: (branchesQuery.data ?? []).map((b) => ({
      queryKey: ["pt-passes", b.id],
      queryFn: () => getPtPasses(b.id),
    })),
  });
  function ptPassName(id: string): string {
    for (const q of passQueries) {
      const hit = q.data?.find((p) => p.id === id);
      if (hit) return hit.name;
    }
    return "-";
  }

  // SUPER_ADMIN 지점 필터 ("" = 전체). FC는 토큰 기준 자동 분기.
  const [branchFilter, setBranchFilter] = useState("");
  const branchId = isSuper ? branchFilter || undefined : undefined;
  // 상태 필터 ("" = 전체) — 데이터가 이미 로드돼 있어 화면에서 거름
  const [statusFilter, setStatusFilter] = useState("");
  // 검색 — 입력이 숫자(전화번호)면 phone=, 이름이면 name= 으로 백엔드 검색 (디바운스 300ms)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const isPhoneSearch = /^[\d-]+$/.test(debouncedSearch);
  const searchName =
    debouncedSearch && !isPhoneSearch ? debouncedSearch : undefined;
  const searchPhone =
    debouncedSearch && isPhoneSearch ? debouncedSearch : undefined;

  const ptQuery = useQuery({
    queryKey: [
      "admin",
      "pt-applications",
      branchId ?? "all",
      searchName ?? "",
      searchPhone ?? "",
    ],
    queryFn: () =>
      getAdminPtApplications(branchId, searchName, searchPhone),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePtApplication(id),
    onSuccess: () => {
      toast.success("PT가 삭제되었습니다.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "pt-applications"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const cancelHoldMutation = useMutation({
    mutationFn: (id: string) =>
      cancelHold({ source_type: "PT_APPLICATION", source_id: id }),
    onSuccess: () => {
      toast.success("홀딩이 취소되었습니다.");
      setCancelHoldTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "pt-applications"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // 행의 [홀딩] 클릭 — 상태에 따라 분기 (만료: 안내 / 홀딩: 취소 / 유효: 등록)
  function handleHoldClick(a: PTApplication) {
    if (a.status === "EXPIRED") {
      toast.error("만료자입니다.");
      return;
    }
    if (a.status === "HELD") {
      setCancelHoldTarget(a);
      return;
    }
    setHoldTarget(a);
  }

  const branchName = (id: string) =>
    branchesQuery.data?.find((b) => b.id === id)?.name ?? "-";

  const applications = ptQuery.data ?? [];
  const visibleApplications = statusFilter
    ? applications.filter((a) => a.status === statusFilter)
    : applications;

  return (
    <div>
      <PageTitle title="PT 조회" />
      <p className="mt-1 text-sm text-gray-500">
        키오스크 PT 신청서로 접수된 개인 레슨 신청입니다.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {isSuper && (
          <div className="w-48">
            <Select
              id="branch-filter"
              label="지점"
              options={[
                { value: "", label: "전체 지점" },
                ...(branchesQuery.data ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ]}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            />
          </div>
        )}
        <div className="w-48">
          <Select
            id="status-filter"
            label="상태"
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="w-64">
          <TextField
            id="search"
            label="검색"
            type="search"
            placeholder="이름 또는 전화번호"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        {ptQuery.isLoading ? (
          <TableMessage>불러오는 중…</TableMessage>
        ) : ptQuery.isError ? (
          <TableMessage>목록을 불러오지 못했습니다.</TableMessage>
        ) : visibleApplications.length === 0 ? (
          <TableMessage>등록된 PT가 없습니다.</TableMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>지점</Th>
                  <Th>이름</Th>
                  <Th>전화번호</Th>
                  <Th>상태</Th>
                  <Th>수강권</Th>
                  <Th>결제 금액</Th>
                  <Th>신청일</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleApplications.map((a) => (
                  <tr key={a.id} className="text-gray-800">
                    <Td>{branchName(a.branch_id)}</Td>
                    <Td className="font-medium">{a.name}</Td>
                    <Td>{formatPhone(a.phone)}</Td>
                    <Td>
                      <StatusBadge status={a.status} />
                    </Td>
                    <Td>{ptPassName(a.pt_pass_id)}</Td>
                    <Td>{formatWon(a.final_price)}</Td>
                    <Td className="text-gray-500">{formatDate(a.created_at)}</Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <RowActionButton
                          variant="neutral"
                          onClick={() => setViewTarget(a)}
                        >
                          보기
                        </RowActionButton>
                        <RowActionButton onClick={() => handleHoldClick(a)}>
                          홀딩
                        </RowActionButton>
                        <RowActionButton onClick={() => setEditTarget(a)}>
                          수정
                        </RowActionButton>
                        <RowActionButton
                          variant="danger"
                          onClick={() => setDeleteTarget(a)}
                        >
                          삭제
                        </RowActionButton>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewTarget && (
        <PtDetailDialog
          key={viewTarget.id}
          app={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {editTarget && (
        <PtEditDialog
          key={editTarget.id}
          app={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {holdTarget && (
        <HoldDialog
          key={holdTarget.id}
          sourceType="PT_APPLICATION"
          sourceId={holdTarget.id}
          name={holdTarget.name}
          phone={holdTarget.phone}
          onClose={() => setHoldTarget(null)}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: ["admin", "pt-applications"],
            })
          }
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        danger
        title="PT 삭제"
        message={
          deleteTarget
            ? `${deleteTarget.name}님의 PT를 삭제하시겠습니까?`
            : ""
        }
        confirmLabel="삭제"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={cancelHoldTarget !== null}
        title="홀딩 취소"
        message={
          cancelHoldTarget
            ? `${cancelHoldTarget.name}님의 홀딩을 취소하시겠습니까?`
            : ""
        }
        confirmLabel="홀딩 취소"
        loading={cancelHoldMutation.isPending}
        onConfirm={() => {
          if (cancelHoldTarget) cancelHoldMutation.mutate(cancelHoldTarget.id);
        }}
        onCancel={() => setCancelHoldTarget(null)}
      />
    </div>
  );
}
