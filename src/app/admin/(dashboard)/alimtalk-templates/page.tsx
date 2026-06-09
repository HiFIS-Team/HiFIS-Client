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
import { useToast } from "@/providers/ToastProvider";

// 알림톡 종류별 ON/OFF (1단계 — 본문 편집/조건 필터는 추후 단계).
// 전역 알림톡 발송 + 지점 토글과 AND 동작 — 어떤 단에서든 끄면 발송 X.
export default function AdminAlimtalkTemplatesPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["admin", "alimtalk-templates"],
    queryFn: getAlimtalkTemplates,
  });
  // 종류 라벨은 enums.trigger_type 으로 한국어 변환
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });

  // trigger_type code → 한국어 라벨 매핑
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

  const isLoading = templatesQuery.isLoading || enumsQuery.isLoading;
  const isError = templatesQuery.isError || enumsQuery.isError;

  return (
    <div>
      <PageTitle title="알림톡 관리" />
      <p className="mt-1 text-sm text-gray-500">
        알림톡 종류별로 발송을 켜고 끌 수 있어요. 전역 알림톡 발송, 지점별
        토글과 함께 동작해서 한 곳이라도 꺼져 있으면 발송되지 않아요.
      </p>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : isError ? (
          <p className="text-sm text-gray-500">
            목록을 불러오지 못했습니다.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(templatesQuery.data ?? []).map((t) => {
              const pending =
                toggleMutation.isPending &&
                toggleMutation.variables?.id === t.id;
              return (
                <section
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-5"
                >
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-gray-900">
                      {triggerLabel(t.trigger_type)}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t.is_enabled ? "발송 중" : "발송 중지"}
                    </p>
                  </div>
                  <Switch
                    checked={t.is_enabled}
                    disabled={pending}
                    onChange={(next) =>
                      toggleMutation.mutate({ id: t.id, next })
                    }
                    ariaLabel={`${triggerLabel(t.trigger_type)} 발송 토글`}
                  />
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
