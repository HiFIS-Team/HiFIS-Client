"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEnums } from "@/lib/api/enums";
import {
  getClothesPasses,
  getLockerPasses,
  getPtPasses,
} from "@/lib/api/passes";
import { updatePtApplication } from "@/lib/api/ptApplications";
import { getErrorMessage } from "@/lib/api/client";
import { referralOptions, resolveReferralForSubmit } from "@/lib/referral";
import { useToast } from "@/providers/ToastProvider";
import { TextField } from "@/components/TextField";
import { DateField } from "@/components/DateField";
import { Select, type SelectOption } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import type { EnumOption, Pass, PTApplication } from "@/lib/api/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}
function enumOpts(arr: EnumOption[]): SelectOption[] {
  return arr.map((o) => ({ value: o.code, label: o.label }));
}
// 둘 다 무료 제공이면 "락커, 운동복 무료 제공" 한 덩어리로 — 라벨이 길어서 잘리는 거 방지
function passOpts(arr: Pass[]): SelectOption[] {
  return arr.map((p) => {
    const items: string[] = [];
    if (p.provides_locker) items.push("락커");
    if (p.provides_clothes) items.push("운동복");
    const tail = items.length > 0 ? ` · ${items.join(", ")} 무료 제공` : "";
    return {
      value: p.id,
      label: `${p.name} · 현금 ${p.cash_price.toLocaleString()}원 / 카드 ${p.card_price.toLocaleString()}원${tail}`,
    };
  });
}

// PT 신청 정보 수정 모달. 부모가 app 이 있을 때만 key={app.id} 로 렌더.
export function PtEditDialog({
  app,
  onClose,
}: {
  app: PTApplication;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  useEscapeKey(onClose);

  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const ptPassQuery = useQuery({
    queryKey: ["pt-passes", app.branch_id],
    queryFn: () => getPtPasses(app.branch_id),
  });
  const lockerPassQuery = useQuery({
    queryKey: ["locker-passes", app.branch_id],
    queryFn: () => getLockerPasses(app.branch_id),
  });
  const clothesPassQuery = useQuery({
    queryKey: ["clothes-passes", app.branch_id],
    queryFn: () => getClothesPasses(app.branch_id),
  });

  const [form, setForm] = useState({
    pt_pass_id: app.pt_pass_id,
    locker_pass_id: app.locker_pass_id,
    clothes_pass_id: app.clothes_pass_id,
    name: app.name,
    gender: app.gender,
    birth_date: app.birth_date,
    phone: app.phone,
    address: app.address,
    referral: app.referral,
    referral_detail: app.referral_detail ?? "",
    motivation: app.motivation,
    payment_method: app.payment_method,
    final_price: String(app.final_price),
    start_date: app.start_date,
    end_date: app.end_date,
    notes: app.notes ?? "",
    agreed_marketing: app.agreed_marketing,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...patch }));

  const mutation = useMutation({
    mutationFn: () => {
      const { referral, referral_detail } = resolveReferralForSubmit(
        form.referral,
        form.referral_detail,
        enumsQuery.data!.referral,
      );
      // 수강권이 무료 제공하면 백엔드가 별도 선택을 400으로 막음 — 무조건 null
      const sel = (ptPassQuery.data ?? []).find(
        (p) => p.id === form.pt_pass_id,
      );
      return updatePtApplication(app.id, {
        pt_pass_id: form.pt_pass_id,
        locker_pass_id: sel?.provides_locker ? null : form.locker_pass_id,
        clothes_pass_id: sel?.provides_clothes ? null : form.clothes_pass_id,
        name: form.name.trim(),
        gender: form.gender,
        birth_date: form.birth_date,
        phone: form.phone.trim(),
        address: form.address.trim(),
        referral,
        referral_detail,
        motivation: form.motivation,
        payment_method: form.payment_method,
        final_price: Number(form.final_price),
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes.trim() || null,
        agreed_marketing: form.agreed_marketing,
      });
    },
    onSuccess: () => {
      toast.success("PT 정보가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin", "pt-applications"] });
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const isLoading =
    enumsQuery.isLoading ||
    ptPassQuery.isLoading ||
    lockerPassQuery.isLoading ||
    clothesPassQuery.isLoading;
  const isError =
    enumsQuery.isError ||
    ptPassQuery.isError ||
    lockerPassQuery.isError ||
    clothesPassQuery.isError;
  // PT 락커·운동복은 무료 제공 — 가격은 PT 에선 반영 안 함.
  // 백엔드 스키마가 UUID 라 placeholder 로 지점의 첫 패스 ID 를 전달.
  const lockerPasses = lockerPassQuery.data ?? [];
  const clothesPasses = clothesPassQuery.data ?? [];
  const today = todayStr();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "이름을 입력해 주세요.";
    if (!form.gender) e.gender = "성별을 선택해 주세요.";
    if (!form.birth_date) e.birth_date = "생년월일을 선택해 주세요.";
    else if (form.birth_date > today)
      e.birth_date = "생년월일은 오늘 이후일 수 없습니다.";
    const digits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "전화번호를 입력해 주세요.";
    else if (digits.length < 9 || digits.length > 12)
      e.phone = "전화번호를 정확히 입력해 주세요.";
    if (!form.address.trim()) e.address = "주소를 입력해 주세요.";
    if (!form.pt_pass_id) e.pt_pass_id = "수강권을 선택해 주세요.";
    if (!form.start_date) e.start_date = "시작일을 선택해 주세요.";
    if (!form.end_date) e.end_date = "종료일을 선택해 주세요.";
    else if (form.start_date && form.end_date < form.start_date)
      e.end_date = "종료일은 시작일보다 빠를 수 없습니다.";
    if (!form.payment_method) e.payment_method = "결제 방법을 선택해 주세요.";
    if (
      form.final_price === "" ||
      Number.isNaN(Number(form.final_price)) ||
      Number(form.final_price) < 0
    )
      e.final_price = "결제 금액을 정확히 입력해 주세요.";
    if (!form.referral) e.referral = "유입 경로를 선택해 주세요.";
    if (!form.motivation) e.motivation = "방문 목적을 선택해 주세요.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-200 px-6 py-4 text-lg font-bold text-gray-900">
          PT 정보 수정
        </h2>

        {isLoading ? (
          <p className="px-6 py-16 text-center text-sm text-gray-500">
            불러오는 중…
          </p>
        ) : isError ? (
          <p className="px-6 py-16 text-center text-sm text-gray-500">
            정보를 불러오지 못했습니다.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col" noValidate>
            <div className="space-y-4 overflow-y-auto px-6 py-5">
              <TextField
                id="pe-name"
                label="이름"
                required
                maxLength={50}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                error={errors.name}
              />
              <Select
                id="pe-gender"
                label="성별"
                required
                placeholder="선택"
                options={enumOpts(enumsQuery.data!.gender)}
                value={form.gender}
                onChange={(e) => set({ gender: e.target.value })}
                error={errors.gender}
              />
              <DateField
                id="pe-birth"
                label="생년월일"
                required
                max={today}
                value={form.birth_date}
                onChange={(e) => set({ birth_date: e.target.value })}
                error={errors.birth_date}
              />
              <TextField
                id="pe-phone"
                label="전화번호"
                required
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                error={errors.phone}
              />
              <TextField
                id="pe-address"
                label="주소"
                required
                maxLength={255}
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                error={errors.address}
              />
              <Select
                id="pe-pt-pass"
                label="수강권"
                required
                placeholder="선택"
                options={passOpts(ptPassQuery.data ?? [])}
                value={form.pt_pass_id}
                onChange={(e) => {
                  const next = (ptPassQuery.data ?? []).find(
                    (p) => p.id === e.target.value,
                  );
                  // 무료 제공 수강권으로 바꾸면 별도 선택 자동 비움
                  set({
                    pt_pass_id: e.target.value,
                    ...(next?.provides_locker
                      ? { locker_pass_id: null }
                      : {}),
                    ...(next?.provides_clothes
                      ? { clothes_pass_id: null }
                      : {}),
                  });
                }}
                error={errors.pt_pass_id}
              />
              {/* PT 락커·운동복 — 수강권이 무료 제공이면 잠금, 아니면 기존 yes/no */}
              {(() => {
                const sel = (ptPassQuery.data ?? []).find(
                  (p) => p.id === form.pt_pass_id,
                );
                const lockerProvided = !!sel?.provides_locker;
                const clothesProvided = !!sel?.provides_clothes;
                return (
                  <>
                    {lockerProvided ? (
                      <Select
                        id="pe-locker-pass"
                        label="락커 (무료 제공)"
                        options={[
                          {
                            value: "PROVIDED",
                            label: "수강권에 포함 (무료 제공)",
                          },
                        ]}
                        value="PROVIDED"
                        onChange={() => {}}
                        disabled
                      />
                    ) : (
                      lockerPasses[0] && (
                        <Select
                          id="pe-locker-pass"
                          label="락커 (무료 제공)"
                          options={[
                            { value: "NO", label: "신청 안 함" },
                            { value: "YES", label: "신청 (무료 제공)" },
                          ]}
                          value={form.locker_pass_id ? "YES" : "NO"}
                          onChange={(e) =>
                            set({
                              locker_pass_id:
                                e.target.value === "YES"
                                  ? lockerPasses[0].id
                                  : null,
                            })
                          }
                        />
                      )
                    )}
                    {clothesProvided ? (
                      <Select
                        id="pe-clothes-pass"
                        label="운동복 (무료 제공)"
                        options={[
                          {
                            value: "PROVIDED",
                            label: "수강권에 포함 (무료 제공)",
                          },
                        ]}
                        value="PROVIDED"
                        onChange={() => {}}
                        disabled
                      />
                    ) : (
                      clothesPasses[0] && (
                        <Select
                          id="pe-clothes-pass"
                          label="운동복 (무료 제공)"
                          options={[
                            { value: "NO", label: "신청 안 함" },
                            { value: "YES", label: "신청 (무료 제공)" },
                          ]}
                          value={form.clothes_pass_id ? "YES" : "NO"}
                          onChange={(e) =>
                            set({
                              clothes_pass_id:
                                e.target.value === "YES"
                                  ? clothesPasses[0].id
                                  : null,
                            })
                          }
                        />
                      )
                    )}
                  </>
                );
              })()}
              <DateField
                id="pe-start"
                label="이용 시작일"
                required
                value={form.start_date}
                onChange={(e) => set({ start_date: e.target.value })}
                error={errors.start_date}
              />
              <DateField
                id="pe-end"
                label="이용 종료일"
                required
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={(e) => set({ end_date: e.target.value })}
                error={errors.end_date}
              />
              <Select
                id="pe-payment"
                label="결제 방법"
                required
                placeholder="선택"
                options={enumOpts(enumsQuery.data!.payment_method)}
                value={form.payment_method}
                onChange={(e) => set({ payment_method: e.target.value })}
                error={errors.payment_method}
              />
              <TextField
                id="pe-price"
                label="최종 결제 금액 (원)"
                required
                type="number"
                inputMode="numeric"
                min={0}
                value={form.final_price}
                onChange={(e) => set({ final_price: e.target.value })}
                error={errors.final_price}
              />
              <Select
                id="pe-referral"
                label="유입 경로"
                required
                placeholder="선택"
                options={enumOpts(referralOptions(enumsQuery.data!.referral))}
                value={form.referral}
                onChange={(e) => set({ referral: e.target.value })}
                error={errors.referral}
              />
              {form.referral === "OTHER" && (
                <TextField
                  id="pe-referral-detail"
                  label="직접 입력"
                  placeholder="예: 전단지, 블로그, 인스타"
                  maxLength={100}
                  value={form.referral_detail}
                  onChange={(e) => set({ referral_detail: e.target.value })}
                  hint="기존 항목 이름(전단지·블로그·인스타 등)과 같으면 그 항목으로 자동 분류돼요."
                />
              )}
              <Select
                id="pe-motivation"
                label="방문 목적"
                required
                placeholder="선택"
                options={enumOpts(enumsQuery.data!.motivation)}
                value={form.motivation}
                onChange={(e) => set({ motivation: e.target.value })}
                error={errors.motivation}
              />
              <Textarea
                id="pe-notes"
                label="비고 (선택)"
                maxLength={500}
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
              <label className="flex cursor-pointer items-center gap-2 select-none pt-1">
                <input
                  type="checkbox"
                  checked={form.agreed_marketing}
                  onChange={(e) =>
                    set({ agreed_marketing: e.target.checked })
                  }
                  className="size-4 rounded accent-primary"
                />
                <span className="text-sm text-gray-700">
                  마케팅 정보 수신 동의
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {mutation.isPending ? "처리 중…" : "저장"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
