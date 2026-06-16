"use client";

import { PageTitle } from "../PageTitle";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useBranch } from "@/providers/BranchProvider";
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

  // 글로벌 지점 — 사이드바 셀렉터에서 선택한 단일 지점.
  const { selectedBranchId: branchId, branches, isSuper } = useBranch();

  // 수강권명 표시용 — 현재 선택 지점의 PT 수강권만.
  const passesQuery = useQuery({
    queryKey: ["pt-passes", branchId ?? "none"],
    queryFn: () => getPtPasses(branchId!),
    enabled: !!branchId,
  });
  function ptPassName(id: string): string {
    return passesQuery.data?.find((p) => p.id === id)?.name ?? "-";
  }
  // 상태 필터 ("" = 전체) — 데이터가 이미 로드돼 있어 화면에서 거름
  const [statusFilter, setStatusFilter] = useState("");
  // 우측 ⚙ 필터 popover 열림 상태
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filterOpen) return;
    function handle(e: PointerEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [filterOpen]);
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
    branches.find((b) => b.id === id)?.name ?? "-";

  const ptPage = ptQuery.data;
  const applications = ptPage?.items ?? [];
  const visibleApplications = applications.filter(
    (a) => !statusFilter || a.status === statusFilter,
  );

  return (
    <div>
      <PageTitle title="PT 조회" />
      <p className="hidden">
        PT 신청서로 접수된 개인 레슨 신청입니다.
      </p>

      {/* 지점은 사이드바 글로벌 셀렉터에서 선택. 페이지 안엔 검색바만 단독.
          상태 필터는 글로벌 SubTabBar 의 우측 끝에 fixed 버튼으로 따로 띄움 (아래).
          SubTabBar 와의 시각 간격을 줄여 mt-2 (검색바가 탭바에 가깝게 붙음). */}
      <div className="relative mt-2 lg:mt-5">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted"
        />
        <input
          id="search"
          type="search"
          placeholder="이름 또는 전화번호로 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-xl border border-line bg-card py-3 pr-4 pl-11 text-[15px] text-fg placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
        />
      </div>

      {/* 모바일 SubTabBar 우측 끝에 떠 있는 필터 버튼 — 회원/PT/예약 탭 행 위에 얹힘.
          상태(유효/만료/홀딩) 옵션만. 전체는 옵션 없이 기본값.
          PC 는 lg:hidden (사이드바 사용 중). */}
      <div className="fixed top-12 right-1 z-20 flex h-12 items-center lg:hidden">
        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="필터"
            className={`flex size-9 items-center justify-center rounded-md transition-colors ${
              statusFilter
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-card-hover hover:text-fg"
            }`}
          >
            <AdjustmentsHorizontalIcon className="size-5" />
          </button>
          {filterOpen && (
            <div className="animate-panel-in absolute top-full right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-card p-1.5 shadow-lg">
              {STATUS_FILTERS.filter((s) => s.value).map((s) => {
                const active = statusFilter === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(active ? "" : s.value);
                      setFilterOpen(false);
                    }}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-fg hover:bg-card-hover"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
              {statusFilter && (
                <>
                  <hr className="my-1.5 border-line" />
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("");
                      setFilterOpen(false);
                    }}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-card-hover hover:text-fg"
                  >
                    전체 보기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 적용된 필터 칩 — 검색바 아래에 시각화. × 로 즉시 해제. */}
      {statusFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {STATUS_FILTERS.find((s) => s.value === statusFilter)?.label}
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              aria-label="필터 해제"
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10"
            >
              <XMarkIcon className="size-3.5" />
            </button>
          </span>
        </div>
      )}

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
                  className="rounded-xl border border-line bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">
                        {a.name}
                      </p>
                      <p className="text-sm text-muted">
                        {formatPhone(a.phone)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-sm">
                    <p className="text-fg">
                      <span className="text-muted">수강권 </span>
                      {ptPassName(a.pt_pass_id)}
                      <span className="ml-2 text-muted">·</span>
                      <span className="ml-2">{formatWon(a.final_price)}</span>
                    </p>
                    <p className="text-xs text-muted">
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
            <div className="hidden overflow-x-auto rounded-xl border border-line bg-card lg:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-card-hover text-muted">
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
              <tbody className="divide-y divide-line">
                {visibleApplications.map((a) => (
                  <tr key={a.id} className="text-fg">
                    <Td>{branchName(a.branch_id)}</Td>
                    <Td className="font-medium">{a.name}</Td>
                    <Td>{formatPhone(a.phone)}</Td>
                    <Td>
                      <StatusBadge status={a.status} />
                    </Td>
                    <Td>{ptPassName(a.pt_pass_id)}</Td>
                    <Td>{formatWon(a.final_price)}</Td>
                    <Td className="text-muted">{formatDate(a.created_at)}</Td>
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
        requireText="삭제"
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
