"use client";

import { useMemo } from "react";
import { PageTitle } from "../PageTitle";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAlimtalkTemplates,
  updateAlimtalkTemplate,
  type AlimtalkTemplate,
} from "@/lib/api/alimtalkTemplates";
import { getEnums } from "@/lib/api/enums";
import { getErrorMessage } from "@/lib/api/client";
import { Switch } from "@/components/Switch";
import { Td, Th, TableMessage, TableSkeleton } from "@/components/Table";
import { RowActionButton } from "@/components/RowActionButton";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/providers/ToastProvider";

// 운영 시나리오 흐름 순서로 정렬 — 예약 → 가입 → 만기 → 홀딩 → 취소 → 재등록.
// 백엔드 라벨 표기 변형(공백·부호)에 견고하게 정규식 매칭.
// negative lookahead 로 "+" 가 포함된 라벨은 단일 패턴에 안 걸리게 분리.
const ALIMTALK_TRIGGER_ORDER: RegExp[] = [
  /^\s*예약(?!.*[+＋])/, // 예약 (또는 "예약 확인") — + 부호 없는 단일
  /예약.*[+＋].*3.*일/, // 예약 +3일
  /예약.*[+＋].*5.*일/, // 예약 +5일
  /(신청|가입).*등록/, // 신청 등록 / 가입 등록
  /가입.*7/, // 가입 +7일
  /가입.*14/, // 가입 +14일
  /가입.*30/, // 가입 +30일
  /만기.*[-－−].*5|만기.*5\s*일\s*전/, // 만기 -5일
  /만기.*[-－−].*2|만기.*2\s*일\s*전/, // 만기 -2일
  /만기.*당일|^\s*만기일?\s*$/, // 만기 당일
  /만기.*[+＋].*30|만기\s*후.*30/, // 만기 +30일
  /홀딩.*시작|시작.*홀딩/, // 홀딩 시작
  /홀딩/, // 그 외 홀딩
  /취소/, // 취소
  /재등록/, // 재등록
];

function triggerOrder(label: string): number {
  for (let i = 0; i < ALIMTALK_TRIGGER_ORDER.length; i++) {
    if (ALIMTALK_TRIGGER_ORDER[i].test(label)) return i;
  }
  return ALIMTALK_TRIGGER_ORDER.length;
}

// 알림톡 종류별 ON/OFF (1단계). 본문 편집·조건 필터는 추후 단계.
// 전역 알림톡 발송 + 지점 토글과 AND 동작.
export default function AdminAlimtalkTemplatesPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["admin", "alimtalk-templates"],
    queryFn: getAlimtalkTemplates,
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
  // 운영 시나리오 흐름 순서로 정렬 — 매칭 안 되는 항목은 뒤로, 같은 순위면 라벨 가나다.
  const items = useMemo(() => {
    const arr = templatesQuery.data ?? [];
    return arr.slice().sort((a, b) => {
      const la = triggerLabel(a.trigger_type);
      const lb = triggerLabel(b.trigger_type);
      const oa = triggerOrder(la);
      const ob = triggerOrder(lb);
      if (oa !== ob) return oa - ob;
      return la.localeCompare(lb);
    });
  }, [templatesQuery.data, triggerLabel]);
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
