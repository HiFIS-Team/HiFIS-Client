"use client";

import { PageTitle } from "../PageTitle";
import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { deleteReservation, getAdminReservations } from "@/lib/api/reservations";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { useBranch } from "@/providers/BranchProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { Td, Th, TableMessage, TableSkeleton } from "@/components/Table";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 40;
import { formatDate, formatPhone } from "@/lib/format";
import type { Reservation } from "@/lib/api/types";

export default function AdminReservationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);

  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId, branches, isSuper } = useBranch();

  // 페이지 — 필터 변경 시 자동 1페이지로 (React 19: useEffect 안 setState 회피)
  const [page, setPage] = useState(1);
  const [prevBranchId, setPrevBranchId] = useState(branchId);
  if (branchId !== prevBranchId) {
    setPrevBranchId(branchId);
    setPage(1);
  }

  const reservationsQuery = useQuery({
    queryKey: ["admin", "reservations", branchId ?? "all", page],
    queryFn: () =>
      getAdminReservations({ branchId, page, pageSize: PAGE_SIZE }),
    // 필터·페이지 변경 시 깜빡임 방지
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReservation(id),
    onSuccess: () => {
      toast.success("예약이 삭제되었습니다.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name ?? "-";

  const reservationsPage = reservationsQuery.data;
  const reservations = reservationsPage?.items ?? [];

  return (
    <div>
      <PageTitle title="예약 신청 조회" />
      <p className="mt-1 text-sm text-gray-500 lg:hidden">
        네이버 플레이스를 통해 접수된 방문 예약입니다.
      </p>

      {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 필터 없음. */}

      <div className="mt-6">
        {reservationsQuery.isLoading ? (
          <TableSkeleton />
        ) : reservationsQuery.isError ? (
          <TableMessage variant="error">목록을 불러오지 못했습니다.</TableMessage>
        ) : reservations.length === 0 ? (
          <TableMessage>예약 신청이 없습니다.</TableMessage>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <ul className="space-y-3 lg:hidden">
              {reservations.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {r.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatPhone(r.phone)}
                      </p>
                    </div>
                    <RowActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(r)}
                    >
                      삭제
                    </RowActionButton>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm">
                    <p className="text-gray-700">
                      <span className="text-gray-400">방문 예정 </span>
                      {formatDate(r.visit_date)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isSuper && (
                        <>
                          {branchName(r.branch_id)}
                          <span className="mx-1.5">·</span>
                        </>
                      )}
                      신청일 {formatDate(r.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* 데스크탑: 기존 테이블 */}
            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 lg:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
                <tr>
                  <Th>지점</Th>
                  <Th>이름</Th>
                  <Th>전화번호</Th>
                  <Th>방문 예정일</Th>
                  <Th>신청일</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reservations.map((r) => (
                  <tr key={r.id} className="text-gray-800">
                    <Td>{branchName(r.branch_id)}</Td>
                    <Td className="font-medium">{r.name}</Td>
                    <Td>{formatPhone(r.phone)}</Td>
                    <Td>{formatDate(r.visit_date)}</Td>
                    <Td className="text-gray-500">{formatDate(r.created_at)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <RowActionButton
                          variant="danger"
                          onClick={() => setDeleteTarget(r)}
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
            {reservationsPage && (
              <Pagination
                page={reservationsPage.page}
                pageSize={reservationsPage.page_size}
                total={reservationsPage.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        danger
        title="예약 삭제"
        message={
          deleteTarget
            ? `${deleteTarget.name}님의 예약을 삭제하시겠습니까?`
            : ""
        }
        confirmLabel="삭제"
        requireText="삭제"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
