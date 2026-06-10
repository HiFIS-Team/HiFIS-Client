"use client";

import { PageTitle } from "../PageTitle";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BuildingOffice2Icon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import {
  deletePtApplication,
  getAdminPtApplication,
  getAdminPtApplications,
} from "@/lib/api/ptApplications";
import { getPtPasses } from "@/lib/api/passes";
import { cancelHold } from "@/lib/api/holds";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowActionButton } from "@/components/RowActionButton";
import { StatusBadge, STATUS_FILTERS } from "@/components/StatusBadge";
import { CATEGORY_FILTERS } from "@/components/CategoryBadge";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { Td, Th, TableMessage, TableSkeleton } from "@/components/Table";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 40;
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { PTApplication } from "@/lib/api/types";
import { HoldDialog } from "../HoldDialog";
import { PtDetailDialog } from "./PtDetailDialog";
import { PtEditDialog } from "./PtEditDialog";

export default function AdminPtApplicationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 푸시 알림 클릭 → /admin/pt-applications?detail=<id> 진입 시 단건 fetch → 상세 자동 오픈
  const detailId = searchParams.get("detail");
  const [deleteTarget, setDeleteTarget] = useState<PTApplication | null>(null);
  const [editTarget, setEditTarget] = useState<PTApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<PTApplication | null>(null);
  const [holdTarget, setHoldTarget] = useState<PTApplication | null>(null);
  const [cancelHoldTarget, setCancelHoldTarget] = useState<PTApplication | null>(
    null,
  );

  const detailQuery = useQuery({
    queryKey: ["admin", "pt-applications", "detail", detailId],
    queryFn: () => getAdminPtApplication(detailId!),
    enabled: !!detailId,
    retry: false,
  });
  // detail fetch 성공 → 자동 오픈 + sessionStorage consumed 마킹.
  // (회원 페이지와 동일 패턴. members/page.tsx 주석 참조)
  useEffect(() => {
    if (!detailQuery.data || detailQuery.data.id !== detailId) return;
    const consumedKey = `admin-detail-consumed:pt:${detailId}`;
    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(consumedKey)
    ) {
      router.replace(pathname);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewTarget(detailQuery.data);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(consumedKey, "1");
    }
    router.replace(pathname);
  }, [detailQuery.data, detailId, router, pathname]);
  useEffect(() => {
    if (detailQuery.isError && detailId) {
      toast.error("해당 PT 신청을 찾을 수 없습니다.");
      router.replace(pathname);
    }
  }, [detailQuery.isError, detailId, toast, router, pathname]);

  // 상세 다이얼로그 닫기 — URL 의 ?detail 정리.
  // consumedKey 는 일부러 제거하지 않음 (탭 세션 동안 유지) :
  // 알림 → 다이얼로그 자동 오픈 → 닫음 → 다른 메뉴 갔다가 PT 페이지로 돌아왔을 때
  // 어떤 경로로든 URL 에 ?detail=ABC 가 다시 들어오는 케이스(router.replace 가 안 먹는 케이스,
  // 캐시된 RSC URL, 브라우저 뒤로가기 등) 에서 또 자동 오픈되던 문제가 있었음.
  function closeView() {
    setViewTarget(null);
    if (detailId) router.replace(pathname);
  }

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
  // 구분 필터 — NEW(신규)/EXISTING(기존) 또는 "" (전체). 상태 필터와 동일 client-side.
  const [categoryFilter, setCategoryFilter] = useState("");
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

  // 페이지 — 필터/검색 변경 시 자동 1페이지로 (React 19: useEffect 안 setState 회피)
  const [page, setPage] = useState(1);
  const filterKey = `${branchId ?? ""}|${searchName}|${searchPhone}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const ptQuery = useQuery({
    queryKey: [
      "admin",
      "pt-applications",
      branchId ?? "all",
      searchName ?? "",
      searchPhone ?? "",
      page,
    ],
    queryFn: () =>
      getAdminPtApplications({
        branchId,
        name: searchName,
        phone: searchPhone,
        page,
        pageSize: PAGE_SIZE,
      }),
    // 필터·페이지 변경 시 깜빡임 방지 — 새 데이터 도착할 때까지 이전 페이지 유지
    placeholderData: keepPreviousData,
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

  const ptPage = ptQuery.data;
  const applications = ptPage?.items ?? [];
  const visibleApplications = applications.filter(
    (a) =>
      (!statusFilter || a.status === statusFilter) &&
      (!categoryFilter || a.category === categoryFilter),
  );

  return (
    <div>
      <PageTitle title="PT 조회" />
      <p className="mt-1 text-sm text-gray-500">
        PT 신청서로 접수된 개인 레슨 신청입니다.
      </p>

      <div
        className={`mt-5 grid gap-3 sm:grid-cols-2 ${
          isSuper ? "lg:max-w-5xl lg:grid-cols-4" : "lg:max-w-4xl lg:grid-cols-3"
        }`}
      >
        {isSuper && (
          <Select
            id="branch-filter"
            label="지점"
            icon={BuildingOffice2Icon}
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
        )}
        <Select
          id="status-filter"
          label="상태"
          icon={FunnelIcon}
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          id="category-filter"
          label="구분"
          icon={FunnelIcon}
          options={CATEGORY_FILTERS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
        <TextField
          id="search"
          label="검색"
          icon={MagnifyingGlassIcon}
          type="search"
          placeholder="이름 또는 전화번호"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {ptQuery.isLoading ? (
          <TableSkeleton />
        ) : ptQuery.isError ? (
          <TableMessage variant="error">목록을 불러오지 못했습니다.</TableMessage>
        ) : visibleApplications.length === 0 ? (
          <TableMessage>등록된 PT가 없습니다.</TableMessage>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <ul className="space-y-3 lg:hidden">
              {visibleApplications.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {a.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatPhone(a.phone)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-sm">
                    <p className="text-gray-700">
                      <span className="text-gray-400">수강권 </span>
                      {ptPassName(a.pt_pass_id)}
                      <span className="ml-2 text-gray-400">·</span>
                      <span className="ml-2">{formatWon(a.final_price)}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {isSuper && (
                        <>
                          {branchName(a.branch_id)}
                          <span className="mx-1.5">·</span>
                        </>
                      )}
                      신청일 {formatDate(a.created_at)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
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
            {ptPage && (
              <Pagination
                page={ptPage.page}
                pageSize={ptPage.page_size}
                total={ptPage.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {viewTarget && (
        <PtDetailDialog
          key={viewTarget.id}
          app={viewTarget}
          onClose={closeView}
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
