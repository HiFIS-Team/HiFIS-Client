"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  BoltIcon,
  CreditCardIcon,
  TicketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import {
  getClothesPasses,
  getLockerPasses,
  getMembershipPasses,
  getPtPasses,
} from "@/lib/api/passes";
import { reRegisterMember } from "@/lib/api/members";
import { reRegisterPtApplication } from "@/lib/api/ptApplications";
import { getRegistrationLookup } from "@/lib/api/registrations";
import { ApiError } from "@/lib/api/client";
import type {
  EnumOption,
  MemberLookup,
  Pass,
  PTLookup,
  RegistrationLookupResponse,
} from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { TextField } from "@/components/TextField";
import { DateField } from "@/components/DateField";
import { NumberField } from "@/components/NumberField";
import { Select, type SelectOption } from "@/components/Select";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";
import { ContractDialog } from "@/components/ContractDialog";
import { DAJIM_MEMBER_TERMS, DAJIM_PT_TERMS } from "@/lib/dajimTerms";
import {
  passDuration,
  ptDurationDays,
  sortPassesForUI,
  type PassDuration,
} from "@/lib/passDuration";
import { RegisterSuccess } from "../RegisterSuccess";

// ─────────── 날짜 헬퍼 ───────────
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}
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
// 종료일은 "마지막 유효일"(포함) — 백엔드 만기 기준 end_date < today.
// 일권/주권은 -1 적용 (1일권 → end=start). 개월권은 관례상 같은 날짜 다음달 유지.
// 시간권은 당일 만료 (end=start).
function applyDuration(startDate: string, duration: PassDuration): string {
  if ("months" in duration) return addMonths(startDate, duration.months);
  if ("days" in duration) return addDays(startDate, duration.days - 1);
  return startDate; // hours — 당일
}
// 활성 상태(현재 이용 중)이면 기존 종료일 다음 날부터, 만료면 오늘부터.
function nextStartDate(prev: { status: string; end_date: string }): string {
  const today = todayStr();
  if (prev.status === "REGISTERED" && prev.end_date >= today) {
    return addDays(prev.end_date, 1);
  }
  return today;
}

// ─────────── Select 옵션 헬퍼 ───────────
function enumOpts(arr: EnumOption[]): SelectOption[] {
  return arr.map((o) => ({ value: o.code, label: o.label }));
}
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

// ─────────── 상태 머신 ───────────
type Stage =
  | { kind: "identify" }
  | { kind: "choose"; lookup: RegistrationLookupResponse; name: string; phone: string }
  | {
      kind: "form-member";
      member: MemberLookup;
      name: string;
      phone: string;
    }
  | {
      kind: "form-pt";
      pt: PTLookup;
      name: string;
      phone: string;
    };

// ═══════════════════════════════════════════
// 최상위 — 단계별 화면 분기
// ═══════════════════════════════════════════
export function RenewalForm({ branchId }: { branchId: string }) {
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const branch = branchesQuery.data?.find((b) => b.id === branchId);
  const branchName = branch?.name ?? "";
  const branchShort = branchName.replace(/^피트니스스타\s*/, "");
  // 다짐 지점(첨단·동광주)만 재등록 시에도 새 약관에 전자서명 받음.
  const isDajim = !!branch?.dajim_enabled;
  const [stage, setStage] = useState<Stage>({ kind: "identify" });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header>
        {branchName && (
          <p className="text-sm font-semibold text-primary">{branchName}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold text-gray-900">재등록 신청서</h1>
        <p className="mt-2 text-sm/6 text-gray-500">
          이름과 전화번호를 입력하면 기존 가입 정보가 자동으로 채워집니다.
        </p>
      </header>

      {stage.kind === "identify" && (
        <IdentifyStep branchId={branchId} onResult={setStage} />
      )}
      {stage.kind === "choose" && (
        <ChooseStep
          lookup={stage.lookup}
          onPickMember={() =>
            setStage({
              kind: "form-member",
              member: stage.lookup.member!,
              name: stage.name,
              phone: stage.phone,
            })
          }
          onPickPt={() =>
            setStage({
              kind: "form-pt",
              pt: stage.lookup.pt!,
              name: stage.name,
              phone: stage.phone,
            })
          }
          onBack={() => setStage({ kind: "identify" })}
        />
      )}
      {stage.kind === "form-member" && (
        <MemberRenewalForm
          branchId={branchId}
          isDajim={isDajim}
          branchShort={branchShort}
          member={stage.member}
          name={stage.name}
          phone={stage.phone}
          onBack={() => setStage({ kind: "identify" })}
        />
      )}
      {stage.kind === "form-pt" && (
        <PtRenewalForm
          branchId={branchId}
          isDajim={isDajim}
          branchShort={branchShort}
          pt={stage.pt}
          name={stage.name}
          phone={stage.phone}
          onBack={() => setStage({ kind: "identify" })}
        />
      )}
    </main>
  );
}

// ═══════════════════════════════════════════
// 1단계 — 본인 확인 (이름·전화 → lookup)
// ═══════════════════════════════════════════
function IdentifyStep({
  branchId,
  onResult,
}: {
  branchId: string;
  onResult: (s: Stage) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lookupMutation = useMutation({
    mutationFn: () =>
      getRegistrationLookup({ branchId, name: name.trim(), phone: phone.trim() }),
    onSuccess: (lookup) => {
      // kinds=[] → 본인 정보 없음. kinds.length>=1 → 다음 단계로.
      if (lookup.kinds.length === 0) return;
      if (lookup.kinds.length === 1) {
        if (lookup.kinds[0] === "MEMBER" && lookup.member) {
          onResult({
            kind: "form-member",
            member: lookup.member,
            name: name.trim(),
            phone: phone.trim(),
          });
        } else if (lookup.kinds[0] === "PT" && lookup.pt) {
          onResult({
            kind: "form-pt",
            pt: lookup.pt,
            name: name.trim(),
            phone: phone.trim(),
          });
        }
        return;
      }
      // 둘 다 보유 → 선택 단계
      onResult({
        kind: "choose",
        lookup,
        name: name.trim(),
        phone: phone.trim(),
      });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const eMap: Record<string, string> = {};
    if (!name.trim()) eMap.name = "이름을 입력해 주세요.";
    const digits = phone.replace(/\D/g, "");
    if (!phone.trim()) eMap.phone = "전화번호를 입력해 주세요.";
    else if (digits.length < 9 || digits.length > 12)
      eMap.phone = "전화번호를 정확히 입력해 주세요.";
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) return;
    lookupMutation.mutate();
  }

  // 빈 응답(kinds=[]) 또는 429 등 에러 — 안내 문구
  let banner: string | null = null;
  if (lookupMutation.isSuccess && lookupMutation.data.kinds.length === 0) {
    banner =
      "회원가입 또는 PT 신청 이력이 확인되지 않아요. 이름·전화번호가 회원가입 시와 같은지 다시 확인해 주세요. 처음 등록이라면 회원가입 신청서를 이용해 주세요.";
  } else if (
    lookupMutation.isError &&
    lookupMutation.error instanceof ApiError &&
    lookupMutation.error.status === 429
  ) {
    banner = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  } else if (lookupMutation.isError) {
    banner = "조회에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      <Section title="본인 확인" icon={UserIcon}>
        <TextField
          id="r-name"
          label="이름"
          required
          maxLength={50}
          placeholder="홍길동"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          hint="회원가입 시 적은 이름과 같아야 합니다."
        />
        <TextField
          id="r-phone"
          label="전화번호"
          required
          type="tel"
          inputMode="numeric"
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
        />
      </Section>

      {banner && (
        <p className="rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
          {banner}
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
          loading={lookupMutation.isPending}
        >
          조회
        </Button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════
// 1.5단계 — 회원·PT 둘 다 보유한 경우 선택
// ═══════════════════════════════════════════
function ChooseStep({
  lookup,
  onPickMember,
  onPickPt,
  onBack,
}: {
  lookup: RegistrationLookupResponse;
  onPickMember: () => void;
  onPickPt: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-gray-600">
        회원권과 수강권 모두 보유하고 계세요. 어떤 걸 재등록하시겠어요?
      </p>
      <ChoiceCard
        icon={TicketIcon}
        title="회원권 재등록"
        desc={
          lookup.member
            ? `현재 ${formatDate(lookup.member.end_date)} 까지 (${statusLabel(lookup.member.status)})`
            : ""
        }
        onClick={onPickMember}
      />
      <ChoiceCard
        icon={BoltIcon}
        title="수강권(PT) 재등록"
        desc={
          lookup.pt
            ? `현재 ${formatDate(lookup.pt.end_date)} 까지 (${statusLabel(lookup.pt.status)})`
            : ""
        }
        onClick={onPickPt}
      />
      <button
        type="button"
        onClick={onBack}
        className="mt-2 block w-full text-center text-sm text-gray-500 underline underline-offset-2"
      >
        다시 조회하기
      </button>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-5 py-5 text-left transition-all hover:border-primary hover:bg-violet-50 active:scale-[0.98]"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-gray-900">{title}</span>
        <span className="block text-sm text-gray-500">{desc}</span>
      </div>
    </button>
  );
}

function statusLabel(s: string): string {
  if (s === "REGISTERED") return "이용 중";
  if (s === "HELD") return "홀딩 중";
  return "만료";
}

// ═══════════════════════════════════════════
// 2단계(A) — 회원 재등록 폼
// ═══════════════════════════════════════════
function MemberRenewalForm({
  branchId,
  isDajim,
  branchShort,
  member,
  name,
  phone,
  onBack,
}: {
  branchId: string;
  isDajim: boolean;
  branchShort: string;
  member: MemberLookup;
  name: string;
  phone: string;
  onBack: () => void;
}) {
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
  const mutation = useMutation({ mutationFn: reRegisterMember });

  // 기존 정보로 prefill — 시작일은 활성 중이면 만기일 다음 날, 만료면 오늘.
  // 종료일은 회원권 기간에 맞춰 자동 (회원권 변경 시 재계산).
  const initialStart = nextStartDate(member);
  const [form, setForm] = useState({
    membership_pass_id: member.membership_pass_id,
    locker_pass_id: member.locker_pass_id ?? "",
    clothes_pass_id: member.clothes_pass_id ?? "",
    payment_method: member.payment_method ?? "",
    final_price: member.final_price != null ? String(member.final_price) : "",
    start_date: initialStart,
    end_date: "", // 회원권 데이터 로드 후 useEffect 없이 derive 로 채움
    agreed_marketing: false,
    locker_opt_out: false,
    clothes_opt_out: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...patch }));
  // 전자서명 — 재등록도 새 약관에 동의 받음 (회원·PT 공통 패턴).
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signature, setSignature] = useState<Blob | null>(null);
  const signaturePreview = useMemo(
    () => (signature ? URL.createObjectURL(signature) : null),
    [signature],
  );
  useEffect(() => {
    if (!signaturePreview) return;
    return () => URL.revokeObjectURL(signaturePreview);
  }, [signaturePreview]);

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
  if (isError) return <Center>정보를 불러오지 못했습니다.</Center>;

  const enums = enumsQuery.data!;
  const membershipPasses = membershipQuery.data ?? [];
  const lockerPasses = lockerQuery.data ?? [];
  const clothesPasses = clothesQuery.data ?? [];

  // 회원권 기간 → 종료일 미세팅 시 처음 한 번 채움 (render 중 derive)
  const durationOf = (id: string): PassDuration | null => {
    const p = membershipPasses.find((x) => x.id === id);
    return p ? passDuration(p) : null;
  };
  if (form.end_date === "" && form.membership_pass_id) {
    const d = durationOf(form.membership_pass_id);
    if (d) {
      setForm((f) => ({ ...f, end_date: applyDuration(f.start_date, d) }));
    }
  }

  function priceOf(passes: Pass[], id: string, useCard: boolean): number {
    const p = passes.find((x) => x.id === id);
    if (!p) return 0;
    return useCard ? p.card_price : p.cash_price;
  }
  function totalFor(next: typeof form): number {
    const useCard = next.payment_method === "CARD";
    const sm = membershipPasses.find((x) => x.id === next.membership_pass_id);
    const sl = lockerPasses.find((x) => x.id === next.locker_pass_id);
    const sc = clothesPasses.find((x) => x.id === next.clothes_pass_id);
    const lockerLockedNext = !!sm?.provides_locker || !!sc?.provides_locker;
    const clothesLockedNext = !!sm?.provides_clothes || !!sl?.provides_clothes;
    return (
      priceOf(membershipPasses, next.membership_pass_id, useCard) +
      (lockerLockedNext
        ? 0
        : priceOf(lockerPasses, next.locker_pass_id, useCard)) +
      (clothesLockedNext
        ? 0
        : priceOf(clothesPasses, next.clothes_pass_id, useCard))
    );
  }
  const setWithPrice = (patch: Partial<typeof form>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, final_price: String(totalFor(next)) };
    });
  };

  const selected = membershipPasses.find(
    (x) => x.id === form.membership_pass_id,
  );
  const selectedLocker = lockerPasses.find(
    (x) => x.id === form.locker_pass_id,
  );
  const selectedClothes = clothesPasses.find(
    (x) => x.id === form.clothes_pass_id,
  );
  const lockerProvided =
    !!selected?.provides_locker || !!selectedClothes?.provides_locker;
  const clothesProvided =
    !!selected?.provides_clothes || !!selectedLocker?.provides_clothes;
  const lockerProvidedLabel = selected?.provides_locker
    ? "회원권에 포함 (무료 제공)"
    : selectedClothes?.provides_locker
      ? "운동복에 포함 (무료 제공)"
      : "포함 (무료 제공)";
  const clothesProvidedLabel = selected?.provides_clothes
    ? "회원권에 포함 (무료 제공)"
    : selectedLocker?.provides_clothes
      ? "락커에 포함 (무료 제공)"
      : "포함 (무료 제공)";

  // 종이 계약서용 회원·상품 정보 — 다짐 지점만 사용.
  // 재등록은 성별이 lookup 에 없어 생략, 이름·전화는 props 그대로.
  const contractMemberInfo = [
    { label: "이름", value: name },
    { label: "연락처", value: phone },
  ];
  const contractProductInfo = [
    { label: "회원권", value: selected?.name ?? "" },
    {
      label: "락커",
      value: lockerProvided
        ? form.locker_opt_out
          ? "선택 안 함"
          : lockerProvidedLabel
        : (selectedLocker?.name ?? "선택 안 함"),
    },
    {
      label: "운동복",
      value: clothesProvided
        ? form.clothes_opt_out
          ? "선택 안 함"
          : clothesProvidedLabel
        : (selectedClothes?.name ?? "선택 안 함"),
    },
    {
      label: "이용 기간",
      value:
        form.start_date && form.end_date
          ? `${form.start_date} ~ ${form.end_date}`
          : "",
    },
    {
      label: "결제 방식",
      value:
        form.payment_method === "CARD"
          ? "카드"
          : form.payment_method === "CASH"
            ? "현금"
            : "",
    },
    {
      label: "결제 금액",
      value: form.final_price
        ? `${Number(form.final_price).toLocaleString()}원`
        : "",
    },
  ];

  const onMembershipChange = (id: string) => {
    const next = membershipPasses.find((x) => x.id === id);
    setForm((f) => {
      const base = { ...f, membership_pass_id: id };
      if (next?.provides_locker) {
        base.locker_pass_id = "";
        base.locker_opt_out = false;
      }
      if (next?.provides_clothes) {
        base.clothes_pass_id = "";
        base.clothes_opt_out = false;
      }
      base.final_price = String(totalFor(base));
      const d = next ? passDuration(next) : null;
      if (d == null) return base;
      const start = base.start_date || todayStr();
      return { ...base, start_date: start, end_date: applyDuration(start, d) };
    });
  };
  const onStartDateChange = (value: string) => {
    setForm((f) => {
      const next = { ...f, start_date: value };
      const d = durationOf(f.membership_pass_id);
      if (d != null && value) next.end_date = applyDuration(value, d);
      return next;
    });
  };
  // 락커 변경 — 그 락커가 운동복을 무료 제공하면 운동복 별도 선택 비움
  const onLockerChange = (id: string) => {
    const next = lockerPasses.find((x) => x.id === id);
    setForm((f) => {
      const base = { ...f, locker_pass_id: id };
      if (next?.provides_clothes) {
        base.clothes_pass_id = "";
        base.clothes_opt_out = false;
      }
      return { ...base, final_price: String(totalFor(base)) };
    });
  };
  const onClothesChange = (id: string) => {
    const next = clothesPasses.find((x) => x.id === id);
    setForm((f) => {
      const base = { ...f, clothes_pass_id: id };
      if (next?.provides_locker) {
        base.locker_pass_id = "";
        base.locker_opt_out = false;
      }
      return { ...base, final_price: String(totalFor(base)) };
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
    // 다짐만 서명 필요. 일반 지점은 서명 없이 JSON 으로 제출 (기존 동작).
    if (isDajim && !signature) return;
    mutation.mutate({
      payload: {
        branch_id: branchId,
        name,
        phone,
        membership_pass_id: form.membership_pass_id,
        locker_pass_id: lockerProvided ? null : form.locker_pass_id || null,
        clothes_pass_id: clothesProvided ? null : form.clothes_pass_id || null,
        payment_method: form.payment_method,
        final_price: Number(form.final_price),
        start_date: form.start_date,
        end_date: form.end_date,
        agreed_marketing: form.agreed_marketing ? true : null,
      },
      signature: isDajim ? signature : undefined,
    });
  }

  const submitError = errorMessage(mutation);
  const optional = (arr: SelectOption[]): SelectOption[] => [
    { value: "", label: "선택 안 함" },
    ...arr,
  ];

  return (
    <>
    <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
      <PrefilledBanner
        name={name}
        phone={phone}
        status={member.status}
        endDate={member.end_date}
        kind="MEMBER"
        onBack={onBack}
      />

      <Section title="회원권 · 이용 기간" icon={TicketIcon}>
        <Select
          id="m-membership"
          label="회원권"
          required
          placeholder="선택해 주세요"
          options={passOpts(membershipPasses)}
          value={form.membership_pass_id}
          onChange={(e) => onMembershipChange(e.target.value)}
          error={errors.membership_pass_id}
        />
        <Select
          id="m-locker"
          label="락커 (선택)"
          options={
            lockerProvided
              ? [
                  { value: "PROVIDED", label: lockerProvidedLabel },
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
              : onLockerChange(e.target.value)
          }
        />
        <Select
          id="m-clothes"
          label="운동복 (선택)"
          options={
            clothesProvided
              ? [
                  { value: "PROVIDED", label: clothesProvidedLabel },
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
              : onClothesChange(e.target.value)
          }
        />
        <DateField
          id="m-start"
          label="이용 시작일"
          required
          value={form.start_date}
          onChange={(e) => onStartDateChange(e.target.value)}
          error={errors.start_date}
          hint={
            member.status === "REGISTERED" && member.end_date >= todayStr()
              ? `현재 회원권이 ${formatDate(member.end_date)} 까지라 다음 날부터 시작돼요.`
              : "현재 회원권이 만료되어 오늘부터 시작돼요."
          }
        />
        <DateField
          id="m-end"
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
          id="m-pay"
          label="결제 방법"
          required
          placeholder="선택해 주세요"
          options={enumOpts(enums.payment_method)}
          value={form.payment_method}
          onChange={(e) => setWithPrice({ payment_method: e.target.value })}
          error={errors.payment_method}
        />
        <NumberField
          id="m-price"
          label="이번 결제 금액"
          required
          placeholder="0"
          value={form.final_price}
          onChange={(next) => set({ final_price: next })}
          error={errors.final_price}
          hint="회원권·락커·운동복·결제수단을 선택하면 자동 계산돼요. 할인이 있으면 직접 수정하세요."
        />
      </Section>

      {isDajim && (
        <ContractAgreement
          signature={signature}
          signaturePreview={signaturePreview}
          onOpen={() => setSignatureOpen(true)}
          error={errors.signature}
        />
      )}

      <MarketingAgreement
        checked={form.agreed_marketing}
        onChange={(v) => set({ agreed_marketing: v })}
      />

      {submitError && (
        <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <SubmitRow
        loading={mutation.isPending}
        onCancel={onBack}
        label="재등록 신청"
        disabled={isDajim && !signature}
      />
    </form>
    {isDajim && (
      <ContractDialog
        open={signatureOpen}
        kind="member"
        branchName={branchShort}
        terms={DAJIM_MEMBER_TERMS}
        memberName={name}
        memberInfo={contractMemberInfo}
        productInfo={contractProductInfo}
        onConfirm={(blob) => {
          setSignature(blob);
          setSignatureOpen(false);
          setErrors((prev) => {
            if (!prev.signature) return prev;
            const next = { ...prev };
            delete next.signature;
            return next;
          });
        }}
        onClose={() => setSignatureOpen(false)}
      />
    )}
    </>
  );
}

// ═══════════════════════════════════════════
// 2단계(B) — PT 재등록 폼 (40일 고정)
// ═══════════════════════════════════════════
function PtRenewalForm({
  branchId,
  isDajim,
  branchShort,
  pt,
  name,
  phone,
  onBack,
}: {
  branchId: string;
  isDajim: boolean;
  branchShort: string;
  pt: PTLookup;
  name: string;
  phone: string;
  onBack: () => void;
}) {
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const ptPassQuery = useQuery({
    queryKey: ["pt-passes", branchId],
    queryFn: () => getPtPasses(branchId),
  });
  const lockerQuery = useQuery({
    queryKey: ["locker-passes", branchId],
    queryFn: () => getLockerPasses(branchId),
  });
  const clothesQuery = useQuery({
    queryKey: ["clothes-passes", branchId],
    queryFn: () => getClothesPasses(branchId),
  });
  const mutation = useMutation({ mutationFn: reRegisterPtApplication });

  // PT 재등록 — end_date 는 시작일·선택 수강권에서 derive (회수 × 4일).
  // 별도 state 로 갖지 않아 ptPasses 로딩과의 race·set-state-in-effect 회피.
  const initialStart = nextStartDate(pt);
  const [form, setForm] = useState({
    pt_pass_id: pt.pt_pass_id,
    locker_pass_id: pt.locker_pass_id ?? "",
    clothes_pass_id: pt.clothes_pass_id ?? "",
    payment_method: pt.payment_method ?? "",
    final_price: pt.final_price != null ? String(pt.final_price) : "",
    start_date: initialStart,
    agreed_marketing: false,
    locker_opt_out: false,
    clothes_opt_out: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...patch }));
  // 전자서명 — 재등록도 새 약관에 동의 받음 (회원·PT 공통 패턴).
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signature, setSignature] = useState<Blob | null>(null);
  const signaturePreview = useMemo(
    () => (signature ? URL.createObjectURL(signature) : null),
    [signature],
  );
  useEffect(() => {
    if (!signaturePreview) return;
    return () => URL.revokeObjectURL(signaturePreview);
  }, [signaturePreview]);

  const isLoading =
    enumsQuery.isLoading ||
    ptPassQuery.isLoading ||
    lockerQuery.isLoading ||
    clothesQuery.isLoading;
  const isError =
    enumsQuery.isError ||
    ptPassQuery.isError ||
    lockerQuery.isError ||
    clothesQuery.isError;
  if (isLoading) return <Center>불러오는 중…</Center>;
  if (isError) return <Center>정보를 불러오지 못했습니다.</Center>;

  const enums = enumsQuery.data!;
  const ptPasses = ptPassQuery.data ?? [];
  const lockerPasses = lockerQuery.data ?? [];
  const clothesPasses = clothesQuery.data ?? [];

  function totalFor(next: typeof form): number {
    const p = ptPasses.find((x) => x.id === next.pt_pass_id);
    if (!p) return 0;
    return next.payment_method === "CARD" ? p.card_price : p.cash_price;
  }
  const onPtPassChange = (id: string) => {
    const next = ptPasses.find((x) => x.id === id);
    setForm((f) => {
      const base = { ...f, pt_pass_id: id };
      if (next?.provides_locker) {
        base.locker_pass_id = "";
        base.locker_opt_out = false;
      }
      if (next?.provides_clothes) {
        base.clothes_pass_id = "";
        base.clothes_opt_out = false;
      }
      return { ...base, final_price: String(totalFor(base)) };
    });
  };
  const setWithPrice = (patch: Partial<typeof form>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, final_price: String(totalFor(next)) };
    });
  };
  const onStartDateChange = (value: string) => {
    setForm((f) => ({ ...f, start_date: value }));
  };

  const selected = ptPasses.find((x) => x.id === form.pt_pass_id);
  const lockerProvided = !!selected?.provides_locker;
  const clothesProvided = !!selected?.provides_clothes;
  // 종료일 derive — 시작일·선택 수강권 둘 다 있어야 계산.
  const endDate =
    form.start_date && selected
      ? addDays(
          form.start_date,
          ptDurationDays(selected) - 1,
        )
      : "";

  // 종이 계약서용 정보 — 다짐 지점만 사용. 재등록은 성별 lookup 없어 생략.
  const contractMemberInfo = [
    { label: "이름", value: name },
    { label: "연락처", value: phone },
  ];
  const contractProductInfo = [
    { label: "수강권", value: selected?.name ?? "" },
    {
      label: "락커",
      value: lockerProvided
        ? form.locker_opt_out
          ? "선택 안 함"
          : "수강권에 포함 (무료 제공)"
        : "선택 안 함",
    },
    {
      label: "운동복",
      value: clothesProvided
        ? form.clothes_opt_out
          ? "선택 안 함"
          : "수강권에 포함 (무료 제공)"
        : "선택 안 함",
    },
    {
      label: "이용 기간",
      value:
        form.start_date && endDate ? `${form.start_date} ~ ${endDate}` : "",
    },
    {
      label: "결제 방식",
      value:
        form.payment_method === "CARD"
          ? "카드"
          : form.payment_method === "CASH"
            ? "현금"
            : "",
    },
    {
      label: "결제 금액",
      value: form.final_price
        ? `${Number(form.final_price).toLocaleString()}원`
        : "",
    },
  ];

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
    if (!form.pt_pass_id) e.pt_pass_id = "수강권을 선택해 주세요.";
    if (!form.start_date) e.start_date = "이용 시작일을 선택해 주세요.";
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
    if (isDajim && !signature) return;
    mutation.mutate({
      payload: {
        branch_id: branchId,
        name,
        phone,
        pt_pass_id: form.pt_pass_id,
        locker_pass_id: lockerProvided ? null : form.locker_pass_id || null,
        clothes_pass_id: clothesProvided ? null : form.clothes_pass_id || null,
        payment_method: form.payment_method,
        final_price: Number(form.final_price),
        start_date: form.start_date,
        end_date: endDate,
        agreed_marketing: form.agreed_marketing ? true : null,
      },
      signature: isDajim ? signature : undefined,
    });
  }

  const submitError = errorMessage(mutation);

  return (
    <>
    <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
      <PrefilledBanner
        name={name}
        phone={phone}
        status={pt.status}
        endDate={pt.end_date}
        kind="PT"
        onBack={onBack}
      />

      <Section title="수강권 · 이용 기간" icon={BoltIcon}>
        <Select
          id="p-pass"
          label="수강권"
          required
          placeholder="선택해 주세요"
          options={passOpts(ptPasses)}
          value={form.pt_pass_id}
          onChange={(e) => onPtPassChange(e.target.value)}
          error={errors.pt_pass_id}
        />
        {lockerProvided ? (
          <Select
            id="p-locker"
            label="락커 (선택)"
            options={[
              { value: "PROVIDED", label: "수강권에 포함 (무료 제공)" },
              { value: "OPT_OUT", label: "선택 안 함" },
            ]}
            value={form.locker_opt_out ? "OPT_OUT" : "PROVIDED"}
            onChange={(e) =>
              set({ locker_opt_out: e.target.value === "OPT_OUT" })
            }
          />
        ) : (
          lockerPasses[0] && (
            <Select
              id="p-locker"
              label="락커 (무료 제공)"
              options={[
                { value: "NO", label: "신청 안 함" },
                { value: "YES", label: "신청 (무료 제공)" },
              ]}
              value={form.locker_pass_id ? "YES" : "NO"}
              onChange={(e) =>
                set({
                  locker_pass_id:
                    e.target.value === "YES" ? lockerPasses[0].id : "",
                })
              }
            />
          )
        )}
        {clothesProvided ? (
          <Select
            id="p-clothes"
            label="운동복 (선택)"
            options={[
              { value: "PROVIDED", label: "수강권에 포함 (무료 제공)" },
              { value: "OPT_OUT", label: "선택 안 함" },
            ]}
            value={form.clothes_opt_out ? "OPT_OUT" : "PROVIDED"}
            onChange={(e) =>
              set({ clothes_opt_out: e.target.value === "OPT_OUT" })
            }
          />
        ) : (
          clothesPasses[0] && (
            <Select
              id="p-clothes"
              label="운동복 (무료 제공)"
              options={[
                { value: "NO", label: "신청 안 함" },
                { value: "YES", label: "신청 (무료 제공)" },
              ]}
              value={form.clothes_pass_id ? "YES" : "NO"}
              onChange={(e) =>
                set({
                  clothes_pass_id:
                    e.target.value === "YES" ? clothesPasses[0].id : "",
                })
              }
            />
          )
        )}
        <DateField
          id="p-start"
          label="이용 시작일"
          required
          value={form.start_date}
          onChange={(e) => onStartDateChange(e.target.value)}
          error={errors.start_date}
          hint={
            pt.status === "REGISTERED" && pt.end_date >= todayStr()
              ? `현재 수강권이 ${formatDate(pt.end_date)} 까지라 다음 날부터 시작돼요.`
              : "현재 수강권이 만료되어 오늘부터 시작돼요."
          }
        />
        <div>
          <p className="block text-sm/6 font-medium text-gray-900">
            이용 종료일
          </p>
          <div className="mt-2 rounded-md bg-gray-100 px-3 py-2.5 text-base text-gray-600">
            {endDate ? formatDate(endDate) : "—"}
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            {selected
              ? `PT 회원은 헬스권 ${ptDurationDays(selected)}일이 제공돼요. 시작일 기준 자동 설정됩니다.`
              : "수강권을 선택하면 헬스권 이용 기간이 자동 설정돼요. (회수 × 4일)"}
          </p>
        </div>
      </Section>

      <Section title="결제" icon={CreditCardIcon}>
        <Select
          id="p-pay"
          label="결제 방법"
          required
          placeholder="선택해 주세요"
          options={enumOpts(enums.payment_method)}
          value={form.payment_method}
          onChange={(e) => setWithPrice({ payment_method: e.target.value })}
          error={errors.payment_method}
        />
        <NumberField
          id="p-price"
          label="이번 결제 금액"
          required
          placeholder="0"
          value={form.final_price}
          onChange={(next) => set({ final_price: next })}
          error={errors.final_price}
          hint="수강권·결제수단을 선택하면 자동 계산돼요. 할인이 있으면 직접 수정하세요."
        />
      </Section>

      {isDajim && (
        <ContractAgreement
          signature={signature}
          signaturePreview={signaturePreview}
          onOpen={() => setSignatureOpen(true)}
          error={errors.signature}
        />
      )}

      <MarketingAgreement
        checked={form.agreed_marketing}
        onChange={(v) => set({ agreed_marketing: v })}
      />

      {submitError && (
        <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <SubmitRow
        loading={mutation.isPending}
        onCancel={onBack}
        label="재등록 신청"
        disabled={isDajim && !signature}
      />
    </form>
    {isDajim && (
      <ContractDialog
        open={signatureOpen}
        kind="pt"
        branchName={branchShort}
        terms={DAJIM_PT_TERMS}
        memberName={name}
        memberInfo={contractMemberInfo}
        productInfo={contractProductInfo}
        onConfirm={(blob) => {
          setSignature(blob);
          setSignatureOpen(false);
          setErrors((prev) => {
            if (!prev.signature) return prev;
            const next = { ...prev };
            delete next.signature;
            return next;
          });
        }}
        onClose={() => setSignatureOpen(false)}
      />
    )}
    </>
  );
}

// ─────────── 공용 UI 조각 ───────────

function PrefilledBanner({
  name,
  phone,
  status,
  endDate,
  kind,
  onBack,
}: {
  name: string;
  phone: string;
  status: string;
  endDate: string;
  kind: "MEMBER" | "PT";
  onBack: () => void;
}) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3.5 text-sm/6 text-gray-700">
      <p>
        <span className="font-semibold">{name}</span> · {phone} 님의
        {kind === "MEMBER" ? " 회원권 " : " 수강권 "}
        재등록입니다.
      </p>
      <p className="mt-1 text-gray-600">
        현재 상태: <span className="font-medium">{statusLabel(status)}</span> ·
        만기일: <span className="font-medium">{formatDate(endDate)}</span>
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 text-xs text-primary underline underline-offset-2"
      >
        다른 사람으로 다시 조회
      </button>
    </div>
  );
}

function MarketingAgreement({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Section title="안내" icon={ArrowPathIcon}>
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm/6 text-gray-700">
        기존 회원가입 시 동의하신 운영 회칙은 그대로 유효합니다.
      </p>
      <Checkbox
        id="r-marketing"
        label="마케팅 정보 수신에 동의합니다. (선택)"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </Section>
  );
}

function SubmitRow({
  loading,
  onCancel,
  label,
  disabled,
}: {
  loading: boolean;
  onCancel: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center justify-center rounded-md px-4 py-3 text-base font-semibold text-gray-600"
      >
        취소
      </button>
      <Button type="submit" className="flex-1" loading={loading} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}

// 재등록 폼의 약관 동의 + 전자서명 섹션 — 회원·PT 공통.
// 빈 상태: 큰 버튼, 서명 후: 미리보기 + "다시 동의" — 폼 안에서 새 약관에 다시 동의 받음.
function ContractAgreement({
  signature,
  signaturePreview,
  onOpen,
  error,
}: {
  signature: Blob | null;
  signaturePreview: string | null;
  onOpen: () => void;
  error?: string;
}) {
  return (
    <Section title="이용약관 동의" icon={ArrowPathIcon}>
      {signature && signaturePreview ? (
        <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3.5 sm:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signaturePreview}
            alt="신청서 미리보기"
            className="h-16 w-12 shrink-0 rounded-lg border border-violet-100 bg-white object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-start gap-1.5 text-sm font-semibold text-primary">
              <CheckCircleIcon
                aria-hidden="true"
                className="size-5 shrink-0"
              />
              <span>약관 동의 + 전자서명 완료</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              내용을 바꾸려면 다시 동의해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            다시 동의
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 px-4 py-5 text-base font-semibold text-primary hover:border-primary hover:bg-violet-50"
        >
          📄 이용약관 동의 + 전자서명
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Section>
  );
}

// 제출 mutation 에러 → 한국어 메시지
function errorMessage(m: {
  isError: boolean;
  error?: unknown;
}): string | null {
  if (!m.isError) return null;
  if (m.error instanceof ApiError && m.error.status === 429) {
    return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (m.error instanceof ApiError && m.error.status === 404) {
    return `${m.error.detail} 이름과 전화번호가 회원가입 시와 같은지 확인해 주세요.`;
  }
  if (m.error instanceof ApiError) return m.error.detail;
  return "신청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
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
