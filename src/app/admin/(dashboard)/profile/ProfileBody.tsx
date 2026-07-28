"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/v2/auth";
import { clearSession } from "@/lib/api/v2/tokenStore";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import {
  avatarTone,
  changePassword,
  rankLabel,
  updateMe,
  uploadMyAvatar,
  withdrawMe,
} from "@/lib/api/v2/employees";
import type { EmployeeOut, WorkStatus } from "@/lib/api/v2/types";
import { PageTitle } from "../PageTitle";

// 프로필 페이지 — GET /employees/me + PATCH · POST /password · POST /avatar · POST /withdraw.
// 이름/아바타색은 저장 버튼, 업무 상태·상태 메시지는 별도 저장 버튼.

// 아바타 색 팔레트 — key 는 백엔드에 저장하는 색 이름, className 은 표시용.
// employees.avatarTone() 매핑과 일치해야 함.
const AVATAR_COLORS: { key: string; className: string }[] = [
  { key: "primary", className: "bg-primary" },
  { key: "violet", className: "bg-violet-500" },
  { key: "emerald", className: "bg-emerald-500" },
  { key: "sky", className: "bg-sky-500" },
  { key: "amber", className: "bg-amber-500" },
  { key: "red", className: "bg-red-500" },
  { key: "pink", className: "bg-pink-500" },
  { key: "neutral", className: "bg-neutral-500" },
];

const WORK_STATUS_OPTIONS: {
  key: WorkStatus;
  label: string;
  emoji: string;
}[] = [
  { key: "AUTO", label: "자동 (출근 기준)", emoji: "🌀" },
  { key: "MEETING", label: "회의중", emoji: "💼" },
  { key: "MEAL", label: "식사", emoji: "🍱" },
  { key: "OUT", label: "외출", emoji: "🚶" },
  { key: "AWAY", label: "자리비움", emoji: "💤" },
];

export function ProfileBody() {
  const meQuery = useQuery({ queryKey: ["v2", "me"] as const, queryFn: getMe });

  return (
    <div>
      <PageTitle title="내 프로필" />

      <div>
        <p className="text-xs text-muted">계정</p>
        <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-fg">
          내 프로필
        </h1>
        <p className="mt-1 text-sm text-muted">
          프로필 이름과 아바타 색을 변경하고 비밀번호를 관리합니다.
        </p>
      </div>

      {meQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted">불러오는 중…</p>
      ) : meQuery.isError ? (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span>{getV2ErrorMessage(meQuery.error)}</span>
        </div>
      ) : meQuery.data ? (
        <ProfileEditor me={meQuery.data} />
      ) : null}
    </div>
  );
}

function ProfileEditor({ me }: { me: EmployeeOut }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <aside className="lg:sticky lg:top-0 lg:self-start">
        <SummaryCard me={me} />
      </aside>
      <div className="space-y-6 lg:col-span-2">
        <BasicInfoCard me={me} />
        <WorkStatusCard me={me} />
        <PasswordCard />
        <WithdrawCard isAdmin={me.role === "ADMIN"} />
      </div>
    </div>
  );
}

// ─────────────── SummaryCard ───────────────

function SummaryCard({ me }: { me: EmployeeOut }) {
  const tone = avatarTone(me.avatarColor);
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center gap-3">
        {me.avatarUrl ? (
          <img
            src={me.avatarUrl}
            alt=""
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${tone}`}
            aria-hidden
          >
            {me.name.charAt(0) || "?"}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-tighter text-fg">
            {me.name || "이름 없음"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">{me.email}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          <MetaCell label="사번" value={me.empNo ?? "-"} mono />
          <MetaCell label="직급" value={rankLabel(me.rank)} />
          <MetaCell label="팀" value={me.team ?? "미지정"} />
          <MetaCell label="권한" value={me.role} mono />
        </dl>
      </div>
    </div>
  );
}

function MetaCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`mt-1 truncate font-semibold text-fg ${mono ? "tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

// ─────────────── BasicInfoCard ───────────────

function BasicInfoCard({ me }: { me: EmployeeOut }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(me.name);
  const [avatarColor, setAvatarColor] = useState(me.avatarColor || "primary");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // me 재로드 시 로컬 값 동기화 (다른 창 저장 등).
  useEffect(() => {
    setName(me.name);
    setAvatarColor(me.avatarColor || "primary");
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "me"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "employees"] });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "me"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "employees"] });
    },
  });

  const dirty = name !== me.name || avatarColor !== (me.avatarColor || "primary");
  const canSave = dirty && name.trim().length > 0 && !saveMutation.isPending;

  function save() {
    if (!canSave) return;
    saveMutation.mutate({ name: name.trim(), avatarColor });
  }

  function handleAvatarPick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) avatarMutation.mutate(f);
    e.target.value = ""; // 같은 파일 재선택 허용
  }

  return (
    <section className="rounded-lg border border-line bg-card p-6">
      <h2 className="text-base font-bold text-fg">기본 정보</h2>

      <div className="mt-5 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-fg">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-fg">프로필 이미지</p>
          <div className="mt-2 flex items-center gap-3">
            {me.avatarUrl ? (
              <img
                src={me.avatarUrl}
                alt=""
                className="size-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarTone(avatarColor)}`}
                aria-hidden
              >
                {name.charAt(0) || "?"}
              </span>
            )}
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={avatarMutation.isPending}
              className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {avatarMutation.isPending ? "업로드 중…" : "이미지 업로드"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleAvatarChange}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            이미지가 없을 땐 아래 아바타 색과 이름 첫 글자로 표시됩니다. (5MB
            이하)
          </p>
          {avatarMutation.isError && (
            <p className="mt-2 text-xs text-red-300">
              {getV2ErrorMessage(avatarMutation.error)}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-fg">아바타 색</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => {
              const active = avatarColor === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setAvatarColor(c.key)}
                  aria-label={c.key}
                  className={`size-7 rounded-md transition-transform ${c.className} ${
                    active
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                      : "hover:scale-110"
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-fg">이메일</p>
            <input
              value={me.email}
              disabled
              className="mt-2 w-full rounded-md border border-line bg-card-hover/60 px-3 py-2.5 text-sm text-muted"
            />
            <p className="mt-2 text-xs text-muted">
              이메일은 관리자만 변경할 수 있습니다.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">사번</p>
            <input
              value={me.empNo ?? "-"}
              disabled
              className="mt-2 w-full rounded-md border border-line bg-card-hover/60 px-3 py-2.5 text-sm tabular-nums text-muted"
            />
            <p className="mt-2 text-xs text-muted">
              가입 시 자동으로 부여됩니다.
            </p>
          </div>
        </div>

        {saveMutation.isError && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <ExclamationTriangleIcon className="size-4 shrink-0" />
            <span>{getV2ErrorMessage(saveMutation.error)}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="rounded-md border border-primary bg-primary/25 px-5 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveMutation.isPending ? "저장 중…" : "저장"}
        </button>
      </div>
    </section>
  );
}

// ─────────────── WorkStatusCard ───────────────

function WorkStatusCard({ me }: { me: EmployeeOut }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WorkStatus>(me.workStatus);
  const [message, setMessage] = useState(me.statusMessage ?? "");

  useEffect(() => {
    setStatus(me.workStatus);
    setMessage(me.statusMessage ?? "");
  }, [me]);

  const statusMutation = useMutation({
    mutationFn: (payload: { workStatus?: WorkStatus; statusMessage?: string | null }) =>
      updateMe(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "me"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "employees"] });
    },
  });

  function pickStatus(s: WorkStatus) {
    setStatus(s);
    statusMutation.mutate({ workStatus: s });
  }

  function saveMessage() {
    statusMutation.mutate({ statusMessage: message.trim() || null });
  }

  const messageDirty = message !== (me.statusMessage ?? "");

  return (
    <section className="rounded-lg border border-line bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-fg">업무 상태</h2>
          <p className="mt-1 text-sm text-muted">
            조직도·사내톡·팀원 목록에서 다른 사람들에게 보여지는 상태입니다.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card-hover px-2.5 py-1 text-xs font-semibold text-muted">
          <span className="size-1.5 rounded-full bg-primary" />
          {status === "AUTO" ? "자동" : "수동"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WORK_STATUS_OPTIONS.slice(0, 4).map((s) => (
          <StatusChip
            key={s.key}
            active={status === s.key}
            onClick={() => pickStatus(s.key)}
            emoji={s.emoji}
            label={s.label}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatusChip
          active={status === "AWAY"}
          onClick={() => pickStatus("AWAY")}
          emoji="💤"
          label="자리비움"
        />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-fg">
          상태 메시지 <span className="text-muted">(선택)</span>
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="예) 14시까지 외근"
            maxLength={100}
            className="flex-1 rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={saveMessage}
            disabled={!messageDirty || statusMutation.isPending}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            저장
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          &quot;근무중&quot; · &quot;오프라인&quot; 은 자동 판정이라 여기서
          선택할 수 없어요. &quot;자동&quot; 을 선택하면 오늘 출퇴근 여부에 따라
          자동으로 표시됩니다.
        </p>
        {statusMutation.isError && (
          <p className="mt-2 text-xs text-red-300">
            {getV2ErrorMessage(statusMutation.error)}
          </p>
        )}
      </div>
    </section>
  );
}

function StatusChip({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-md border py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-line text-fg hover:bg-card-hover"
      }`}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

// ─────────────── PasswordCard ───────────────

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      // 비번 변경 시 백엔드가 token_version 증가시켜 기존 세션 무효화 →
      // 자연스러운 흐름 : 로그아웃 후 재로그인.
      setTimeout(() => {
        clearSession();
        router.push("/admin/login");
      }, 1500);
    },
  });

  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    next === confirm &&
    !mutation.isPending;

  return (
    <section className="rounded-lg border border-line bg-card p-6">
      <h2 className="text-base font-bold text-fg">비밀번호 변경</h2>

      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-fg">
            현재 비밀번호
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-fg">
              새 비밀번호 <span className="text-muted">(8자 이상)</span>
            </label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-fg">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {mutation.isError && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <ExclamationTriangleIcon className="size-4 shrink-0" />
            <span>{getV2ErrorMessage(mutation.error)}</span>
          </div>
        )}
        {success && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            변경됐어요. 잠시 후 로그인 화면으로 이동합니다.
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() =>
            mutation.mutate({ currentPassword: current, newPassword: next })
          }
          disabled={!canSubmit}
          className="rounded-md border border-primary bg-primary/25 px-5 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:opacity-40"
        >
          {mutation.isPending ? "변경 중…" : "비밀번호 변경"}
        </button>
      </div>
    </section>
  );
}

// ─────────────── WithdrawCard ───────────────

function WithdrawCard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: withdrawMe,
    onSuccess: () => {
      clearSession();
      router.push("/admin/login");
    },
  });

  function withdraw() {
    if (
      !confirm(
        "정말 탈퇴할까요? 이름·연락처가 삭제되고 계정이 비활성화됩니다. 되돌릴 수 없어요.",
      )
    )
      return;
    mutation.mutate();
  }

  return (
    <section className="rounded-lg border border-red-500/50 bg-card p-6">
      <h2 className="text-base font-bold text-red-400">회원 탈퇴</h2>
      <p className="mt-2 text-sm text-muted">
        탈퇴하면 이름·연락처 등 개인 식별 정보와 로그인 수단이 삭제되고 계정이
        비활성화돼요. 회사가 법적으로 보관해야 하는 근태·급여 기록은 익명
        처리되어 일정 기간 보존될 수 있어요.
      </p>
      {isAdmin && (
        <p className="mt-2 text-xs text-amber-300">
          관리자 권한 계정이라 다른 관리자가 있어야 탈퇴할 수 있어요.
        </p>
      )}
      {mutation.isError && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span>{getV2ErrorMessage(mutation.error)}</span>
        </div>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={withdraw}
          disabled={mutation.isPending}
          className="rounded-md border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mutation.isPending ? "탈퇴 중…" : "회원 탈퇴하기"}
        </button>
      </div>
    </section>
  );
}
