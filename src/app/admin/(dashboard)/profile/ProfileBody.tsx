"use client";

import { useState } from "react";
import { PageTitle } from "../PageTitle";

// 프로필 페이지 — 좌 요약(스크롤 sticky) + 우 기본 정보·업무 상태 카드.
// mock — 실제 API·업로드·저장은 다음 스텝.

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-blue-500",
  "bg-slate-400",
  "bg-sky-400",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-green-600",
  "bg-lime-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-rose-500",
  "bg-pink-500",
  "bg-fuchsia-500",
  "bg-purple-500",
  "bg-violet-500",
  "bg-slate-600",
  "bg-slate-400",
];

type WorkStatus = "auto" | "meeting" | "meal" | "out" | "away";
const WORK_STATUS: { key: WorkStatus; label: string; emoji: string }[] = [
  { key: "auto", label: "자동 (출근 기준)", emoji: "🌀" },
  { key: "meeting", label: "회의중", emoji: "💼" },
  { key: "meal", label: "식사", emoji: "🍱" },
  { key: "out", label: "외출", emoji: "🚶" },
  { key: "away", label: "자리비움", emoji: "💤" },
];

// mock 프로필 (API 연결 전).
const PROFILE = {
  name: "김데모",
  email: "demo@hinest.app",
  employeeId: "PD0000042",
  position: "사원",
  team: "프로덕트팀",
  role: "MEMBER",
};

export function ProfileBody() {
  const [name, setName] = useState(PROFILE.name);
  const [avatarColor, setAvatarColor] = useState<string>("bg-primary");
  const [status, setStatus] = useState<WorkStatus>("auto");
  const [statusMessage, setStatusMessage] = useState("");

  return (
    <div>
      <PageTitle title="내 프로필" />

      {/* 상단 */}
      <div>
        <p className="text-xs text-muted">계정</p>
        <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-fg">
          내 프로필
        </h1>
        <p className="mt-1 text-sm text-muted">
          프로필 이름과 아바타 색을 변경하고 비밀번호를 관리합니다.
        </p>
      </div>

      {/* 본문 : lg 좌 1/3 (sticky) · 우 2/3 (섹션 여러 카드) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 좌 : 요약 카드 — lg 에서 sticky. main 스크롤 컨테이너 기준 top-0. */}
        <aside className="lg:sticky lg:top-0 lg:self-start">
          <SummaryCard
            name={name}
            avatarColor={avatarColor}
            email={PROFILE.email}
            employeeId={PROFILE.employeeId}
            position={PROFILE.position}
            team={PROFILE.team}
            role={PROFILE.role}
          />
        </aside>

        {/* 우 : 카드 여러 개 */}
        <div className="space-y-6 lg:col-span-2">
          <BasicInfoCard
            name={name}
            onNameChange={setName}
            avatarColor={avatarColor}
            onAvatarColorChange={setAvatarColor}
            email={PROFILE.email}
            employeeId={PROFILE.employeeId}
          />
          <WorkStatusCard
            status={status}
            onStatusChange={setStatus}
            message={statusMessage}
            onMessageChange={setStatusMessage}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────── SummaryCard ───────────────

function SummaryCard({
  name,
  avatarColor,
  email,
  employeeId,
  position,
  team,
  role,
}: {
  name: string;
  avatarColor: string;
  email: string;
  employeeId: string;
  position: string;
  team: string;
  role: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColor}`}
          aria-hidden
        >
          {name.charAt(0) || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-tighter text-fg">
            {name || "이름 없음"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">{email}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          <MetaCell label="사번" value={employeeId} mono />
          <MetaCell label="직급" value={position} />
          <MetaCell label="팀" value={team} />
          <MetaCell label="권한" value={role} mono />
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

function BasicInfoCard({
  name,
  onNameChange,
  avatarColor,
  onAvatarColorChange,
  email,
  employeeId,
}: {
  name: string;
  onNameChange: (v: string) => void;
  avatarColor: string;
  onAvatarColorChange: (v: string) => void;
  email: string;
  employeeId: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-card p-6">
      <h2 className="text-base font-bold text-fg">기본 정보</h2>

      <div className="mt-5 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-fg">이름</label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-fg">프로필 이미지</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColor}`}
              aria-hidden
            >
              {name.charAt(0) || "?"}
            </span>
            <button
              type="button"
              className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
            >
              이미지 업로드
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            이미지가 없을 땐 아래 아바타 색과 이름 첫 글자로 표시됩니다. (10MB
            이하)
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-fg">아바타 색</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c, i) => {
              const active = avatarColor === c;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAvatarColorChange(c)}
                  aria-label={c}
                  className={`size-7 rounded-md transition-transform ${c} ${
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
              value={email}
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
              value={employeeId}
              disabled
              className="mt-2 w-full rounded-md border border-line bg-card-hover/60 px-3 py-2.5 text-sm tabular-nums text-muted"
            />
            <p className="mt-2 text-xs text-muted">
              가입 시 자동으로 부여됩니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="rounded-md border border-primary bg-primary/25 px-5 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
        >
          저장
        </button>
      </div>
    </section>
  );
}

// ─────────────── WorkStatusCard ───────────────

function WorkStatusCard({
  status,
  onStatusChange,
  message,
  onMessageChange,
}: {
  status: WorkStatus;
  onStatusChange: (s: WorkStatus) => void;
  message: string;
  onMessageChange: (v: string) => void;
}) {
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
          {status === "auto" ? "자동" : "수동"}
        </span>
      </div>

      {/* 상태 chip 그리드 — 첫 줄 4개 + 두번째 줄 자리비움 */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WORK_STATUS.slice(0, 4).map((s) => (
          <StatusChip
            key={s.key}
            active={status === s.key}
            onClick={() => onStatusChange(s.key)}
            emoji={s.emoji}
            label={s.label}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatusChip
          active={status === "away"}
          onClick={() => onStatusChange("away")}
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
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="예) 14시까지 외근"
            className="flex-1 rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            저장
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          &quot;근무중&quot; · &quot;오프라인&quot; 은 자동 판정이라 여기서
          선택할 수 없어요. &quot;자동&quot; 을 선택하면 오늘 출퇴근 여부에 따라
          자동으로 표시됩니다.
        </p>
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
