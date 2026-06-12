"use client";

import { useMemo, useState } from "react";
import { PageTitle } from "../PageTitle";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TagIcon } from "@heroicons/react/24/outline";
import {
  getAlimtalkTemplates,
  updateAlimtalkTemplate,
  type AlimtalkTemplate,
} from "@/lib/api/alimtalkTemplates";
import { getEnums } from "@/lib/api/enums";
import { getErrorMessage } from "@/lib/api/client";
import { getSystemConfig } from "@/lib/api/systemConfig";
import { useBranch } from "@/providers/BranchProvider";
import { Select } from "@/components/Select";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Switch } from "@/components/Switch";
import { Td, Th, TableMessage, TableSkeleton } from "@/components/Table";
import { RowActionButton } from "@/components/RowActionButton";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/providers/ToastProvider";
import { AlimtalkTemplateDialog } from "./AlimtalkTemplateDialog";

// 알림톡 종류별 본문/ON·OFF 관리. 모든 어드민 권한(SUPER_ADMIN / FC) 사용 가능.
// 전역 / 지점별 토글과 AND 동작 — 한 곳이라도 꺼져 있으면 발송 X.
export default function AdminAlimtalkTemplatesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  // 글로벌 지점 — 백엔드가 (branch_id, trigger_type) 복합 키라 지점별로 따로 로드.
  const { selectedBranchId: branchId, branches, isSuper } = useBranch();

  const templatesQuery = useQuery({
    queryKey: ["admin", "alimtalk-templates", branchId ?? "self"],
    queryFn: () => getAlimtalkTemplates(branchId),
    enabled: !!branchId,
  });
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  // 전역 발송 마스터 — SUPER_ADMIN 만 read 권한. FC 는 백엔드가 권한 풀릴 때까지 모름.
  const systemConfigQuery = useQuery({
    queryKey: ["admin", "system-config"],
    queryFn: getSystemConfig,
    enabled: isSuper,
  });
  // 발송 차단 여부 — 전역(SystemConfig.messaging_enabled) AND 지점(Branch.messaging_enabled) AND 트리거 토글
  // 셋 중 하나라도 OFF 면 실제 발송 차단. 여기선 위 두 단계 (전역·지점) 가 OFF 일 때를 UI 로 노출.
  const currentBranch = branches.find((b) => b.id === branchId);
  const globalOn = isSuper
    ? systemConfigQuery.data
      ? systemConfigQuery.data.messaging_enabled
      : true // 로드 전엔 ON 가정해 깜빡임 방지
    : true; // FC 는 전역 모름 — ON 가정 (백엔드 권한 풀린 후 정확화)
  const branchOn = currentBranch ? currentBranch.messaging_enabled : true;
  const masterOn = globalOn && branchOn;
  const blockReason = !globalOn
    ? "전역 알림톡 발송이 꺼져 있어요. 지점 관리에서 켜야 알림톡이 발송돼요."
    : !branchOn
      ? "이 지점의 알림톡 발송이 꺼져 있어요. 지점 관리에서 켜야 알림톡이 발송돼요."
      : null;

  // 종류 필터 ("" = 전체)
  const [typeFilter, setTypeFilter] = useState("");

  // 보기/수정 다이얼로그 타깃
  const [dialog, setDialog] = useState<{
    template: AlimtalkTemplate;
    mode: "view" | "edit";
  } | null>(null);

  const triggerLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of enumsQuery.data?.trigger_type ?? []) {
      map.set(t.code, t.label);
    }
    return (code: string) => map.get(code) ?? code;
  }, [enumsQuery.data]);

  // 카드 정렬은 종류 셀렉터(백엔드 enum)와 동일한 순서.
  const triggerIndex = useMemo(() => {
    const map = new Map<string, number>();
    (enumsQuery.data?.trigger_type ?? []).forEach((o, i) => map.set(o.code, i));
    return map;
  }, [enumsQuery.data]);

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

  // 캐시 업데이트 — 토글 / 본문 저장 응답을 동일하게 처리.
  // queryKey 의 branch 키를 동일하게 맞춰야 setQueryData 가 정확히 그 캐시에 들어감.
  function applyUpdated(updated: AlimtalkTemplate) {
    qc.setQueryData<AlimtalkTemplate[]>(
      ["admin", "alimtalk-templates", branchId ?? "self"],
      (prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev,
    );
  }

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; next: boolean }) =>
      updateAlimtalkTemplate(vars.id, { is_enabled: vars.next }),
    onSuccess: (updated) => {
      applyUpdated(updated);
      toast.success(
        updated.is_enabled
          ? "알림톡 발송을 켰어요."
          : "알림톡 발송을 껐어요.",
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const bodyMutation = useMutation({
    mutationFn: (vars: { id: string; body: string | null }) =>
      updateAlimtalkTemplate(vars.id, { body: vars.body }),
    onSuccess: (updated) => {
      applyUpdated(updated);
      toast.success(
        updated.body === null
          ? "디폴트 본문으로 복원했어요."
          : "본문을 저장했어요.",
      );
      setDialog(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isLoading = templatesQuery.isLoading || enumsQuery.isLoading;
  const isError = templatesQuery.isError || enumsQuery.isError;
  const isTogglePending = (id: string) =>
    toggleMutation.isPending && toggleMutation.variables?.id === id;

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
      <p className="mt-1 text-sm text-gray-500 lg:hidden">
        알림톡 종류별로 본문을 수정하고 발송을 켜고 끌 수 있어요. 전역 알림톡
        발송, 지점별 토글과 함께 동작해서 한 곳이라도 꺼져 있으면 발송되지
        않아요.
      </p>

      {blockReason && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p>{blockReason}</p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-md">
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
            {/* 모바일: 카드 (회원/PT 패턴) */}
            <ul className="space-y-3 lg:hidden">
              {items.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-gray-900">
                      {triggerLabel(t.trigger_type)}
                    </p>
                    <StatusChip enabled={t.is_enabled} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    마지막 수정 {formatDateTime(t.updated_at)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <RowActionButton
                        variant="neutral"
                        onClick={() =>
                          setDialog({ template: t, mode: "view" })
                        }
                      >
                        보기
                      </RowActionButton>
                      <RowActionButton
                        onClick={() =>
                          setDialog({ template: t, mode: "edit" })
                        }
                      >
                        수정
                      </RowActionButton>
                    </div>
                    <Switch
                      checked={masterOn && t.is_enabled}
                      disabled={!masterOn || isTogglePending(t.id)}
                      onChange={(next) =>
                        toggleMutation.mutate({ id: t.id, next })
                      }
                      ariaLabel={`${triggerLabel(t.trigger_type)} 발송 토글`}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* 데스크탑: 테이블 */}
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
                            onClick={() =>
                              setDialog({ template: t, mode: "view" })
                            }
                          >
                            보기
                          </RowActionButton>
                          <RowActionButton
                            onClick={() =>
                              setDialog({ template: t, mode: "edit" })
                            }
                          >
                            수정
                          </RowActionButton>
                          <Switch
                            checked={masterOn && t.is_enabled}
                            disabled={!masterOn || isTogglePending(t.id)}
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

      {dialog && (
        <AlimtalkTemplateDialog
          open
          mode={dialog.mode}
          template={dialog.template}
          triggerLabel={triggerLabel(dialog.template.trigger_type)}
          saving={
            bodyMutation.isPending &&
            bodyMutation.variables?.id === dialog.template.id
          }
          onSave={(body) =>
            bodyMutation.mutate({ id: dialog.template.id, body })
          }
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
