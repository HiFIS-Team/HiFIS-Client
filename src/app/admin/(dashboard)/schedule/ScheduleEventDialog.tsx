"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import {
  AcademicCapIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  FolderIcon,
  GiftIcon,
  HeartIcon,
  MapPinIcon,
  RectangleStackIcon,
  ShoppingBagIcon,
  SunIcon,
  TrophyIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 일정 추가 모달 — 폼 저장은 다음 스텝(API 붙일 때).
// 지금은 UI 만 : 로컬 state 로 선택 표시만 유지, 저장 시 alert / 콘솔.

// 카테고리 정의
interface Category {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}
const CATEGORIES: Category[] = [
  { key: "meeting", label: "회의", icon: UsersIcon },
  { key: "deadline", label: "마감", icon: ClockIcon },
  { key: "trip", label: "외근·출장", icon: MapPinIcon },
  { key: "vacation", label: "휴가", icon: SunIcon },
  { key: "event", label: "사내행사", icon: BuildingOffice2Icon },
  { key: "anniversary", label: "기념일", icon: GiftIcon },
  { key: "task", label: "업무", icon: BriefcaseIcon },
  { key: "interview", label: "면접", icon: UserIcon },
  { key: "workshop", label: "교육·워크샵", icon: AcademicCapIcon },
  { key: "client", label: "고객·미팅", icon: ShoppingBagIcon },
  { key: "gathering", label: "회식·모임", icon: TrophyIcon },
  { key: "health", label: "건강·병원", icon: HeartIcon },
  { key: "personal", label: "개인일정", icon: UserPlusIcon },
  { key: "general", label: "일반", icon: RectangleStackIcon },
];

// 공유 범위 정의
interface Scope {
  key: string;
  label: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}
const PRIMARY_SCOPES: Scope[] = [
  { key: "team", label: "팀", desc: "같은 팀 구성원에게 공유", icon: UserGroupIcon },
  { key: "project", label: "프로젝트", desc: "선택한 프로젝트 멤버에게만 공유", icon: FolderIcon },
  { key: "private", label: "개인", desc: "나만 볼 수 있어요", icon: UserIcon },
];
const CUSTOM_SCOPE: Scope = {
  key: "custom",
  label: "대상 지정",
  desc: "선택한 구성원에게만 공유",
  icon: UserPlusIcon,
};

// 색상 팔레트 — 16색. bg 클래스 그대로.
const COLORS = [
  { key: "blue", bg: "bg-blue-500" },
  { key: "sky", bg: "bg-sky-500" },
  { key: "cyan", bg: "bg-cyan-500" },
  { key: "teal", bg: "bg-teal-500" },
  { key: "emerald", bg: "bg-emerald-500" },
  { key: "green", bg: "bg-green-500" },
  { key: "lime", bg: "bg-lime-500" },
  { key: "amber", bg: "bg-amber-500" },
  { key: "orange", bg: "bg-orange-500" },
  { key: "red", bg: "bg-red-500" },
  { key: "pink", bg: "bg-pink-500" },
  { key: "fuchsia", bg: "bg-fuchsia-500" },
  { key: "purple", bg: "bg-purple-500" },
  { key: "violet", bg: "bg-violet-500" },
  { key: "slate", bg: "bg-slate-500" },
];

interface ScheduleEventDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ScheduleEventDialog({ open, onClose }: ScheduleEventDialogProps) {
  useEscapeKey(onClose, open);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<string>("meeting");
  const [scope, setScope] = useState<string>("team");
  const [color, setColor] = useState<string>("blue");
  const [memo, setMemo] = useState("");

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogGradientHeader
          kicker="NEW EVENT"
          title="일정 추가"
          onClose={onClose}
        />

        {/* 본문 — 폼 필드들, 세로 스크롤 */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* 제목 */}
          <Field label="제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="무엇을 계획하고 있나요?"
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 시작 / 종료 (2열) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="시작">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <IconInput
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChange={setStartDate}
                  icon={CalendarIcon}
                />
                <IconInput
                  placeholder="--:--"
                  value={startTime}
                  onChange={setStartTime}
                  icon={ClockIcon}
                  size="time"
                />
              </div>
            </Field>
            <Field label="종료">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <IconInput
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChange={setEndDate}
                  icon={CalendarIcon}
                />
                <IconInput
                  placeholder="--:--"
                  value={endTime}
                  onChange={setEndTime}
                  icon={ClockIcon}
                  size="time"
                />
              </div>
            </Field>
          </div>

          {/* 카테고리 */}
          <Field label="카테고리">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-line text-fg hover:bg-card-hover"
                    }`}
                  >
                    <Icon className="size-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 공유 범위 */}
          <Field label="공유 범위">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PRIMARY_SCOPES.map((s) => (
                <ScopeCard
                  key={s.key}
                  scope={s}
                  active={scope === s.key}
                  onClick={() => setScope(s.key)}
                />
              ))}
            </div>
            <div className="mt-3 sm:max-w-[calc((100%-1.5rem)/3)]">
              <ScopeCard
                scope={CUSTOM_SCOPE}
                active={scope === CUSTOM_SCOPE.key}
                onClick={() => setScope(CUSTOM_SCOPE.key)}
              />
            </div>
          </Field>

          {/* 색상 */}
          <Field label="색상">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => {
                const active = color === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    aria-label={c.key}
                    className={`flex size-7 items-center justify-center rounded-full ${c.bg} ${
                      active
                        ? "ring-2 ring-white ring-offset-2 ring-offset-card"
                        : ""
                    }`}
                  >
                    {active && <CheckIcon className="size-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 메모 */}
          <Field label="메모" hint="(선택)">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="참석자·장소·준비물 등 상세 내용을 적어주세요"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            일정 추가
          </button>
        </div>
      </div>
    </div>
  );
}

// 공용 필드 wrapper — 라벨 + 컨텐츠
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-fg">
        {label}
        {hint && <span className="ml-1 text-muted">{hint}</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// 우측 아이콘이 붙은 텍스트 입력 — 날짜·시간 placeholder 시각화.
// 실제 date/time picker 는 다음 스텝 (native 또는 커스텀).
function IconInput({
  placeholder,
  value,
  onChange,
  icon: Icon,
  size = "date",
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  size?: "date" | "time";
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2.5 focus-within:border-primary ${
        size === "time" ? "w-32" : ""
      }`}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm tabular-nums text-fg placeholder-muted focus:outline-none"
      />
      <Icon className="size-4 shrink-0 text-muted" />
    </div>
  );
}

// 공유 범위 큰 카드
function ScopeCard({
  scope,
  active,
  onClick,
}: {
  scope: Scope;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = scope.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : "border-line hover:bg-card-hover"
      }`}
    >
      <Icon
        className={`size-5 shrink-0 ${active ? "text-primary" : "text-muted"}`}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{scope.label}</p>
        <p className="mt-0.5 text-xs text-muted">{scope.desc}</p>
      </div>
    </button>
  );
}
