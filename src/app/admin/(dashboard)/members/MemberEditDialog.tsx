"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEnums } from "@/lib/api/enums";
import {
  getClothesPasses,
  getLockerPasses,
  getMembershipPasses,
} from "@/lib/api/passes";
import { updateMember } from "@/lib/api/members";
import { getErrorMessage } from "@/lib/api/client";
import { referralOptions, resolveReferralForSubmit } from "@/lib/referral";
import { useToast } from "@/providers/ToastProvider";
import { TextField } from "@/components/TextField";
import { DateField } from "@/components/DateField";
import { Select, type SelectOption } from "@/components/Select";
import type { EnumOption, Member, Pass } from "@/lib/api/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}
function enumOpts(arr: EnumOption[]): SelectOption[] {
  return arr.map((o) => ({ value: o.code, label: o.label }));
}
function passOpts(arr: Pass[]): SelectOption[] {
  return arr.map((p) => ({
    value: p.id,
    label: `${p.name} · 현금 ${p.cash_price.toLocaleString()}원 / 카드 ${p.card_price.toLocaleString()}원`,
  }));
}

// 회원 정보 수정 모달. 부모가 member 가 있을 때만, key={member.id} 로 렌더한다.
export function MemberEditDialog({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  useEscapeKey(onClose);

  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const membershipQuery = useQuery({
    queryKey: ["membership-passes", member.branch_id],
    queryFn: () => getMembershipPasses(member.branch_id),
  });
  const lockerQuery = useQuery({
    queryKey: ["locker-passes", member.branch_id],
    queryFn: () => getLockerPasses(member.branch_id),
  });
  const clothesQuery = useQuery({
    queryKey: ["clothes-passes", member.branch_id],
    queryFn: () => getClothesPasses(member.branch_id),
  });

  const [form, setForm] = useState({
    membership_pass_id: member.membership_pass_id,
    name: member.name,
    gender: member.gender,
    birth_date: member.birth_date,
    phone: member.phone,
    address: member.address,
    referral: member.referral,
    // 기타 자유 입력 — 기존 회원이 가지고 있던 detail 보존 + 수정 가능
    referral_detail: member.referral_detail ?? "",
    payment_method: member.payment_method,
    final_price: String(member.final_price),
    start_date: member.start_date,
    end_date: member.end_date,
    locker_pass_id: member.locker_pass_id ?? "",
    clothes_pass_id: member.clothes_pass_id ?? "",
    motivation: member.motivation,
    agreed_marketing: member.agreed_marketing,
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
      return updateMember(member.id, {
        membership_pass_id: form.membership_pass_id,
        name: form.name.trim(),
        gender: form.gender,
        birth_date: form.birth_date,
        phone: form.phone.trim(),
        address: form.address.trim(),
        referral,
        referral_detail,
        payment_method: form.payment_method,
        final_price: Number(form.final_price),
        start_date: form.start_date,
        end_date: form.end_date,
        locker_pass_id: form.locker_pass_id || null,
        clothes_pass_id: form.clothes_pass_id || null,
        motivation: form.motivation,
        agreed_marketing: form.agreed_marketing,
      });
    },
    onSuccess: () => {
      toast.success("회원 정보가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const isLoading =
    enumsQuery.isLoading ||
    membershipQuery.isLoading ||
    lockerQuery.isLoading ||
    clothesQuery.isLoading;
  const isError =
    enumsQuery.isError ||
    membershipQuery.isError ||
    lockerQuery.isError ||
    clothesQuery.isError;

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
    if (!form.membership_pass_id)
      e.membership_pass_id = "회원권을 선택해 주세요.";
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

  // 락커·운동복 선택 항목 — "선택 안 함" 옵션 추가
  const optional = (arr: SelectOption[]): SelectOption[] => [
    { value: "", label: "선택 안 함" },
    ...arr,
  ];

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
          회원 정보 수정
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
                id="e-name"
                label="이름"
                required
                maxLength={50}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                error={errors.name}
              />
              <Select
                id="e-gender"
                label="성별"
                required
                placeholder="선택"
                options={enumOpts(enumsQuery.data!.gender)}
                value={form.gender}
                onChange={(e) => set({ gender: e.target.value })}
                error={errors.gender}
              />
              <DateField
                id="e-birth"
                label="생년월일"
                required
                max={today}
                value={form.birth_date}
                onChange={(e) => set({ birth_date: e.target.value })}
                error={errors.birth_date}
              />
              <TextField
                id="e-phone"
                label="전화번호"
                required
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                error={errors.phone}
              />
              <TextField
                id="e-address"
                label="주소"
                required
                maxLength={255}
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                error={errors.address}
              />
              <Select
                id="e-membership"
                label="회원권"
                required
                placeholder="선택"
                options={passOpts(membershipQuery.data ?? [])}
                value={form.membership_pass_id}
                onChange={(e) => set({ membership_pass_id: e.target.value })}
                error={errors.membership_pass_id}
              />
              <Select
                id="e-locker"
                label="락커 (선택)"
                options={optional(passOpts(lockerQuery.data ?? []))}
                value={form.locker_pass_id}
                onChange={(e) => set({ locker_pass_id: e.target.value })}
              />
              <Select
                id="e-clothes"
                label="운동복 (선택)"
                options={optional(passOpts(clothesQuery.data ?? []))}
                value={form.clothes_pass_id}
                onChange={(e) => set({ clothes_pass_id: e.target.value })}
              />
              <DateField
                id="e-start"
                label="이용 시작일"
                required
                value={form.start_date}
                onChange={(e) => set({ start_date: e.target.value })}
                error={errors.start_date}
              />
              <DateField
                id="e-end"
                label="이용 종료일"
                required
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={(e) => set({ end_date: e.target.value })}
                error={errors.end_date}
              />
              <Select
                id="e-payment"
                label="결제 방법"
                required
                placeholder="선택"
                options={enumOpts(enumsQuery.data!.payment_method)}
                value={form.payment_method}
                onChange={(e) => set({ payment_method: e.target.value })}
                error={errors.payment_method}
              />
              <TextField
                id="e-price"
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
                id="e-referral"
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
                  id="e-referral-detail"
                  label="직접 입력"
                  placeholder="예: 전단지, 블로그, 인스타"
                  maxLength={100}
                  value={form.referral_detail}
                  onChange={(e) => set({ referral_detail: e.target.value })}
                  hint="기존 항목 이름(전단지·블로그·인스타 등)과 같으면 그 항목으로 자동 분류돼요."
                />
              )}
              <Select
                id="e-motivation"
                label="방문 목적"
                required
                placeholder="선택"
                options={enumOpts(enumsQuery.data!.motivation)}
                value={form.motivation}
                onChange={(e) => set({ motivation: e.target.value })}
                error={errors.motivation}
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
