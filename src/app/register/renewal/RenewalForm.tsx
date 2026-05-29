"use client";

import {
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  CreditCardIcon,
  TicketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import {
  getClothesPasses,
  getLockerPasses,
  getMembershipPasses,
} from "@/lib/api/passes";
import { reRegisterMember } from "@/lib/api/members";
import { ApiError } from "@/lib/api/client";
import type { EnumOption, Pass } from "@/lib/api/types";
import { TextField } from "@/components/TextField";
import { DateField } from "@/components/DateField";
import { NumberField } from "@/components/NumberField";
import { Select, type SelectOption } from "@/components/Select";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";
import {
  passDuration,
  sortPassesForUI,
  type PassDuration,
} from "@/lib/passDuration";
import { RegisterSuccess } from "../RegisterSuccess";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

// YYYY-MM-DD 에 개월 수를 더한다 (말일 초과 시 해당 월 말일로 보정).
function addMonths(dateStr: string, months: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${target.getFullYear()}-${mm}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function applyDuration(startDate: string, duration: PassDuration): string {
  return "months" in duration
    ? addMonths(startDate, duration.months)
    : addDays(startDate, duration.days);
}

function enumOpts(arr: EnumOption[]): SelectOption[] {
  return arr.map((o) => ({ value: o.code, label: o.label }));
}

// 상품 목록 → Select 옵션. 카테고리 → 기간 → 가격 순.
function passOpts(arr: Pass[]): SelectOption[] {
  return sortPassesForUI(arr).map((p) => {
    const items: string[] = [];
    if (p.provides_locker) items.push("락커");
    if (p.provides_clothes) items.push("운동복");
    return {
      value: p.id,
      label: p.name,
      description: `현금 ${p.cash_price.toLocaleString()}원 / 카드 ${p.card_price.toLocaleString()}원`,
      meta: items.length > 0 ? `${items.join(", ")} 무료 제공` : undefined,
    };
  });
}

const INITIAL = {
  // 본인 식별용 (기존 회원 lookup)
  name: "",
  phone: "",
  // 새 회원권·결제 정보
  membership_pass_id: "",
  locker_pass_id: "",
  clothes_pass_id: "",
  start_date: "",
  end_date: "",
  payment_method: "",
  final_price: "",
  // 마케팅 동의 — null=기존 값 유지(체크 안 함), true/false=새로 설정
  // 키오스크 UX 단순화: 체크 안 했으면 null(유지), 체크하면 true
  agreed_marketing: false,
  // 무료 제공 회원권에서 "선택 안 함"으로 바꾼 경우 (UI 표시용, 백엔드 영향 없음)
  locker_opt_out: false,
  clothes_opt_out: false,
};

type FormState = typeof INITIAL;

export function RenewalForm({ branchId }: { branchId: string }) {
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  // enums 는 결제 방법 옵션에 필요
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const membershipQuery = useQuery({
    queryKey: ["membership-passes", branchId],
    queryFn: () => getMembershipPasses(branchId),
  });
  const lockerQuery = useQuery({
    queryKey: ["locker-passes", branchId],
    queryFn: () => getLockerPasses(branchId),
  });
  const clothesQuery = useQuery({
    queryKey: ["clothes-passes", branchId],
    queryFn: () => getClothesPasses(branchId),
  });

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({ mutationFn: reRegisterMember });

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const today = todayStr();

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

  if (isLoading) return <Center>불러오는 중…</Center>;
  if (isError) {
    return (
      <Center>
        신청서 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </Center>
    );
  }

  const enums = enumsQuery.data!;
  const membershipPasses = membershipQuery.data ?? [];
  const lockerPasses = lockerQuery.data ?? [];
  const clothesPasses = clothesQuery.data ?? [];
  const branchName =
    branchesQuery.data?.find((b) => b.id === branchId)?.name ?? "";

  // 선택한 상품 가격 합계
  function priceOf(passes: Pass[], id: string, useCard: boolean): number {
    const p = passes.find((x) => x.id === id);
    if (!p) return 0;
    return useCard ? p.card_price : p.cash_price;
  }
  function totalFor(next: FormState): number {
    const useCard = next.payment_method === "CARD";
    return (
      priceOf(membershipPasses, next.membership_pass_id, useCard) +
      priceOf(lockerPasses, next.locker_pass_id, useCard) +
      priceOf(clothesPasses, next.clothes_pass_id, useCard)
    );
  }
  const setWithPrice = (patch: Partial<FormState>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, final_price: String(totalFor(next)) };
    });
  };

  const durationOf = (passId: string): PassDuration | null => {
    const p = membershipPasses.find((x) => x.id === passId);
    return p ? passDuration(p.name) : null;
  };
  const selectedMembership = membershipPasses.find(
    (x) => x.id === form.membership_pass_id,
  );
  const lockerProvided = !!selectedMembership?.provides_locker;
  const clothesProvided = !!selectedMembership?.provides_clothes;

  // 회원권 선택 — 가격 + 이용 기간 자동 설정. 무료 제공 회원권이면 별도 락커·운동복 비움.
  const onMembershipChange = (id: string) => {
    const next = membershipPasses.find((x) => x.id === id);
    setForm((f) => {
      const base: FormState = { ...f, membership_pass_id: id };
      if (next?.provides_locker) {
        base.locker_pass_id = "";
        base.locker_opt_out = false;
      }
      if (next?.provides_clothes) {
        base.clothes_pass_id = "";
        base.clothes_opt_out = false;
      }
      base.final_price = String(totalFor(base));
      const d = durationOf(id);
      if (d == null) return base;
      const start = base.start_date || today;
      return { ...base, start_date: start, end_date: applyDuration(start, d) };
    });
  };

  const onStartDateChange = (value: string) => {
    setForm((f) => {
      const next: FormState = { ...f, start_date: value };
      const d = durationOf(f.membership_pass_id);
      if (d != null && value) next.end_date = applyDuration(value, d);
      return next;
    });
  };

  if (mutation.isSuccess) {
    return (
      <RegisterSuccess
        title="재등록이 완료되었습니다"
        name={mutation.data.name}
      />
    );
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "이름을 입력해 주세요.";
    const digits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "전화번호를 입력해 주세요.";
    else if (digits.length < 9 || digits.length > 12)
      e.phone = "전화번호를 정확히 입력해 주세요.";

    if (!form.membership_pass_id)
      e.membership_pass_id = "회원권을 선택해 주세요.";

    if (!form.start_date) e.start_date = "이용 시작일을 선택해 주세요.";
    if (!form.end_date) e.end_date = "이용 종료일을 선택해 주세요.";
    else if (form.start_date && form.end_date < form.start_date)
      e.end_date = "종료일은 시작일보다 빠를 수 없습니다.";

    if (!form.payment_method) e.payment_method = "결제 방법을 선택해 주세요.";
    if (form.final_price === "")
      e.final_price = "결제 금액을 입력해 주세요.";
    else if (
      Number.isNaN(Number(form.final_price)) ||
      Number(form.final_price) < 0
    )
      e.final_price = "결제 금액을 정확히 입력해 주세요.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      branch_id: branchId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      membership_pass_id: form.membership_pass_id,
      // 회원권이 무료 제공하면 백엔드가 별도 선택을 400으로 막음 — 무조건 null
      locker_pass_id: lockerProvided ? null : form.locker_pass_id || null,
      clothes_pass_id: clothesProvided ? null : form.clothes_pass_id || null,
      payment_method: form.payment_method,
      final_price: Number(form.final_price),
      start_date: form.start_date,
      end_date: form.end_date,
      // 체크 안 했으면 null(기존 값 유지), 체크했으면 true 로 갱신.
      // 의도적으로 false 로 바꾸려면 어드민 수정에서. 키오스크는 양성 액션만 가능.
      agreed_marketing: form.agreed_marketing ? true : null,
    });
  }

  let submitError: string | null = null;
  if (mutation.isError) {
    if (mutation.error instanceof ApiError && mutation.error.status === 429) {
      submitError = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    } else if (
      mutation.error instanceof ApiError &&
      mutation.error.status === 404
    ) {
      // 백엔드 메시지 그대로 — "재등록할 회원 정보를 찾을 수 없습니다."
      submitError = `${mutation.error.detail} 이름과 전화번호가 회원가입 시와 같은지 확인해 주세요.`;
    } else if (mutation.error instanceof ApiError) {
      submitError = mutation.error.detail;
    } else {
      submitError = "신청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    }
  }

  const optional = (arr: SelectOption[]): SelectOption[] => [
    { value: "", label: "선택 안 함" },
    ...arr,
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header>
        {branchName && (
          <p className="text-sm font-semibold text-primary">{branchName}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          재등록 신청서
        </h1>
        <p className="mt-2 text-sm/6 text-gray-500">
          기존 회원의 회원권 재등록입니다. 회원가입 시 사용하신{" "}
          <span className="font-semibold text-gray-700">이름·전화번호</span>{" "}
          그대로 입력해 주세요. <span className="text-red-500">*</span> 는 필수
          항목입니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
        <Section title="본인 확인" icon={UserIcon}>
          <TextField
            id="name"
            label="이름"
            required
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="홍길동"
            maxLength={50}
            error={errors.name}
            hint="회원가입 신청 시 적은 이름과 같아야 본인 확인이 됩니다."
          />
          <TextField
            id="phone"
            label="전화번호"
            required
            type="tel"
            inputMode="numeric"
            placeholder="010-1234-5678"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
            error={errors.phone}
          />
        </Section>

        <Section title="회원권 · 이용 기간" icon={TicketIcon}>
          <Select
            id="membership-pass"
            label="회원권"
            required
            placeholder="선택해 주세요"
            options={passOpts(membershipPasses)}
            value={form.membership_pass_id}
            onChange={(e) => onMembershipChange(e.target.value)}
            error={errors.membership_pass_id}
          />
          {/* 무료 제공 회원권일 땐 "포함(기본)" / "선택 안 함" 두 옵션. 안 쓰는 회원도
              있으니 잠그지 않음. 백엔드 제출은 어차피 null */}
          <Select
            id="locker-pass"
            label="락커 (선택)"
            options={
              lockerProvided
                ? [
                    { value: "PROVIDED", label: "회원권에 포함 (무료 제공)" },
                    { value: "OPT_OUT", label: "선택 안 함" },
                  ]
                : optional(passOpts(lockerPasses))
            }
            value={
              lockerProvided
                ? form.locker_opt_out
                  ? "OPT_OUT"
                  : "PROVIDED"
                : form.locker_pass_id
            }
            onChange={(e) =>
              lockerProvided
                ? set({ locker_opt_out: e.target.value === "OPT_OUT" })
                : setWithPrice({ locker_pass_id: e.target.value })
            }
          />
          <Select
            id="clothes-pass"
            label="운동복 (선택)"
            options={
              clothesProvided
                ? [
                    { value: "PROVIDED", label: "회원권에 포함 (무료 제공)" },
                    { value: "OPT_OUT", label: "선택 안 함" },
                  ]
                : optional(passOpts(clothesPasses))
            }
            value={
              clothesProvided
                ? form.clothes_opt_out
                  ? "OPT_OUT"
                  : "PROVIDED"
                : form.clothes_pass_id
            }
            onChange={(e) =>
              clothesProvided
                ? set({ clothes_opt_out: e.target.value === "OPT_OUT" })
                : setWithPrice({ clothes_pass_id: e.target.value })
            }
          />
          <DateField
            id="start-date"
            label="이용 시작일"
            required
            value={form.start_date}
            onChange={(e) => onStartDateChange(e.target.value)}
            error={errors.start_date}
            hint="회원권을 선택하면 등록일(오늘)로 채워져요."
          />
          <DateField
            id="end-date"
            label="이용 종료일"
            required
            min={form.start_date || undefined}
            value={form.end_date}
            onChange={(e) => set({ end_date: e.target.value })}
            error={errors.end_date}
            hint="회원권 기간에 맞춰 자동 계산돼요."
          />
        </Section>

        <Section title="결제" icon={CreditCardIcon}>
          <Select
            id="payment-method"
            label="결제 방법"
            required
            placeholder="선택해 주세요"
            options={enumOpts(enums.payment_method)}
            value={form.payment_method}
            onChange={(e) => setWithPrice({ payment_method: e.target.value })}
            error={errors.payment_method}
          />
          <NumberField
            id="final-price"
            label="이번 결제 금액"
            required
            placeholder="0"
            value={form.final_price}
            onChange={(next) => set({ final_price: next })}
            error={errors.final_price}
            hint="회원권·락커·운동복·결제수단을 선택하면 자동 계산돼요. 할인이 있으면 직접 수정하세요."
          />
        </Section>

        <Section title="안내" icon={ArrowPathIcon}>
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm/6 text-gray-700">
            기존 회원가입 시 동의하신 운영 회칙은 그대로 유효합니다.
            마케팅 정보 수신은 아래에서 추가로 동의하실 수 있어요.
          </p>
          <Checkbox
            id="agreed-marketing"
            label="마케팅 정보 수신에 동의합니다. (선택)"
            checked={form.agreed_marketing}
            onChange={(e) => set({ agreed_marketing: e.target.checked })}
          />
        </Section>

        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href={`/register?branch_id=${branchId}`}
            className="flex items-center justify-center rounded-md px-4 py-3 text-base font-semibold text-gray-600"
          >
            취소
          </Link>
          <Button
            type="submit"
            className="flex-1"
            loading={mutation.isPending}
          >
            재등록 신청
          </Button>
        </div>
      </form>
    </main>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 pt-8">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-primary">
          <Icon className="size-5" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 text-center text-gray-500">
      {children}
    </main>
  );
}
