"use client";

import { useMemo, useState } from "react";
import { PageTitle } from "../PageTitle";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BuildingOffice2Icon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  getAlimtalkTemplates,
  updateAlimtalkTemplate,
  type AlimtalkTemplate,
} from "@/lib/api/alimtalkTemplates";
import { getMe } from "@/lib/api/auth";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import { getErrorMessage } from "@/lib/api/client";
import { Select } from "@/components/Select";
import { Switch } from "@/components/Switch";
import { Td, Th, TableMessage, TableSkeleton } from "@/components/Table";
import { RowActionButton } from "@/components/RowActionButton";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/providers/ToastProvider";

// 알림톡 종류별 ON/OFF (1단계). 본문 편집·조건 필터는 추후 단계.
// 전역 알림톡 발송 + 지점 토글과 AND 동작.
export default function AdminAlimtalkTemplatesPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const isSuper = meQuery.data?.role === "SUPER_ADMIN";

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    enabled: isSuper,
  });

  // 지점 필터 — "전체 지점" 옵션 없음. SUPER_ADMIN 기본값은 화순점.
  // FC 는 토큰 기반 자동 분기라 셀렉터 자체를 숨김.
  const [branchFilter, setBranchFilter] = useState("");
  const branches = branchesQuery.data ?? [];
  const defaultBranch =
    branches.find((b) => b.name.includes("화순")) ?? branches[0];
  const branchId = isSuper ? branchFilter || defaultBranch?.id : undefined;

  // 종류 필터 — "" = 전체 종류. 클라이언트 측 필터 (그 지점의 row 가 15개 정도라 부담 없음).
  const [typeFilter, setTypeFilter] = useState("");

  const templatesQuery = useQuery({
    queryKey: ["admin", "alimtalk-templates", branchId ?? "self"],
    queryFn: () => getAlimtalkTemplates(branchId),
    placeholderData: keepPreviousData,
    // SUPER_ADMIN 은 branchId 정해진 뒤에만 호출 (브랜치 로드 전 한 번 비호출).
    enabled: !isSuper || !!branchId,
  });
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });

  const triggerLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of enumsQuery.data?.trigger_type ?? []) {
      map.set(t.code, t.label);
    }
    return (code: string) => map.get(code) ?? code;
  }, [enumsQuery.data]);

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; next: boolean }) =>
      updateAlimtalkTemplate(vars.id, { is_enabled: vars.next }),
    onSuccess: (updated) => {
      qc.setQueryData<AlimtalkTemplate[]>(
        ["admin", "alimtalk-templates"],
        (prev) =>
          prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev,
      );
      toast.success(
        updated.is_enabled
          ? "알림톡 발송을 켰어요."
          : "알림톡 발송을 껐어요.",
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // 본문 편집/상세 보기는 2단계 — 일단 자리만, 클릭 시 "준비 중" 안내.
  function notReadyYet() {
    toast.success("준비 중인 기능이에요.");
  }

  const isLoading = templatesQuery.isLoading || enumsQuery.isLoading;
  const isError = templatesQuery.isError || enumsQuery.isError;
  // 카드 정렬은 종류 셀렉터(백엔드 enum)와 동일한 순서. trigger_type code → index 맵으로 정렬.
  const triggerIndex = useMemo(() => {
    const map = new Map<string, number>();
    (enumsQuery.data?.trigger_type ?? []).forEach((o, i) => map.set(o.code, i));
    return map;
  }, [enumsQuery.data]);

  // 종류 필터 적용 후 enum 순서대로 정렬. 매칭 안 되는 항목은 뒤로.
  const items = useMemo(() => {
    const arr = templatesQuery.data ?? [];
    const filtered = typeFilter
      ? arr.filter((t) => t.trigger_type === typeFilter)
      : arr;
    return filtered.slice().sort((a, b) => {
      const ia = triggerIndex.get(a.trigger_type) ?? Number.MAX_SAFE_INTEGER;
      const ib = triggerIndex.get(b.trigger_type) ?? Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });
  }, [templatesQuery.data, triggerIndex, typeFilter]);
  const isTogglePending = (id: string) =>
    toggleMutation.isPending && toggleMutation.variables?.id === id;

  // 발송 중/중지 라벨 — 회원 페이지 StatusBadge 톤(작은 칩) 과 동일.
  function StatusChip({ enabled }: { enabled: boolean }) {
    return (
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          enabled
            ? "bg-green-50 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {enabled ? "발송 중" : "발송 중지"}
      </span>
    );
  }

  return (
    <div>
      <PageTitle title="알림톡 관리" />
      <p className="mt-1 text-sm text-gray-500">
        알림톡 종류별로 발송을 켜고 끌 수 있어요. 전역 알림톡 발송, 지점별
        토글과 함께 동작해서 한 곳이라도 꺼져 있으면 발송되지 않아요.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
        {isSuper && (
          <Select
            id="branch-filter"
            label="지점"
            icon={BuildingOffice2Icon}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchFilter || defaultBranch?.id || ""}
            onChange={(e) => setBranchFilter(e.target.value)}
          />
        )}
        <Select
          id="type-filter"
          label="종류"
          icon={TagIcon}
          options={[
            { value: "", label: "전체 종류" },
            ...(enumsQuery.data?.trigger_type ?? []).map((o) => ({
              value: o.code,
              label: o.label,
            })),
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <TableMessage variant="error">
            목록을 불러오지 못했습니다.
          </TableMessage>
        ) : items.length === 0 ? (
          <TableMessage>등록된 알림톡이 없습니다.</TableMessage>
        ) : (
          <>
            {/* 모바일: 카드 (회원/PT 페이지와 동일 패턴) */}
            <ul className="space-y-3 lg:hidden">
              {items.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  {/* 상단: 종류 (좌) + 발송 상태 칩 (우) */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-gray-900">
                      {triggerLabel(t.trigger_type)}
                    </p>
                    <StatusChip enabled={t.is_enabled} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    마지막 수정 {formatDateTime(t.updated_at)}
                  </p>
                  {/* 하단: 보기/수정 (좌) + 토글 (우 끝) */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <RowActionButton
                        variant="neutral"
                        onClick={notReadyYet}
                      >
                        보기
                      </RowActionButton>
                      <RowActionButton onClick={notReadyYet}>
                        수정
                      </RowActionButton>
                    </div>
                    <Switch
                      checked={t.is_enabled}
                      disabled={isTogglePending(t.id)}
                      onChange={(next) =>
                        toggleMutation.mutate({ id: t.id, next })
                      }
                      ariaLabel={`${triggerLabel(t.trigger_type)} 발송 토글`}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* 데스크탑: 테이블 (회원/PT 페이지와 동일 패턴) */}
            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 lg:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
                  <tr>
                    <Th>종류</Th>
                    <Th>상태</Th>
                    <Th>마지막 수정</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((t) => (
                    <tr key={t.id} className="text-gray-800">
                      <Td className="font-medium">
                        {triggerLabel(t.trigger_type)}
                      </Td>
                      <Td>
                        <StatusChip enabled={t.is_enabled} />
                      </Td>
                      <Td className="text-gray-500">
                        {formatDateTime(t.updated_at)}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-2">
                          <RowActionButton
                            variant="neutral"
                            onClick={notReadyYet}
                          >
                            보기
                          </RowActionButton>
                          <RowActionButton onClick={notReadyYet}>
                            수정
                          </RowActionButton>
                          <Switch
                            checked={t.is_enabled}
                            disabled={isTogglePending(t.id)}
                            onChange={(next) =>
                              toggleMutation.mutate({ id: t.id, next })
                            }
                            ariaLabel={`${triggerLabel(t.trigger_type)} 발송 토글`}
                          />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
