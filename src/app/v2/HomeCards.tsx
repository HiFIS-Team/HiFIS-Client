"use client";

import { useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import {
  ClipboardDocumentCheckIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  ClockIcon,
  TrophyIcon,
  CalendarIcon,
  BanknotesIcon,
  MegaphoneIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";

// v2 홈 하단 카드 — 바코드 · 인사 · 오늘 근무 · 앱 그리드.
// 스타일 규약(v2-styling-conventions) 준수 :
//   카드 rounded-lg, bg-card, p-5, 세로 gap space-y-2.
// 지금은 mock. API 붙일 때 각 카드 컴포넌트 분리 예정.

const WEEKDAY = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}`;
}
function greetingForHour(h: number) {
  if (h < 5) return "좋은 밤이에요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

// 바코드 placeholder — 폭 factor 배열. 화면 폭에 flex 비율로 스트레치.
// 나중에 실제 라이브러리(jsbarcode 등) 로 교체.
const BAR_WIDTHS = [
  2, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2,
  3, 1, 2, 1, 2, 3, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1,
  1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 2, 3, 1, 1,
];

export function HomeCards({ name = "은후" }: { name?: string }) {
  return (
    <div className="space-y-2 p-4">
      <BarcodeCard />
      <GreetingCard name={name} />
      <AttendanceCard />
      <AppGridCard />
      <TodayTasksCard />
      <NoticesCard />
    </div>
  );
}

function BarcodeCard() {
  return (
    <div className="rounded-lg bg-white p-4">
      <div className="flex h-14 items-stretch gap-[1.5px]" aria-label="바코드">
        {BAR_WIDTHS.map((w, i) => (
          <div key={i} className="bg-black" style={{ flex: `${w} 0 0` }} />
        ))}
      </div>
    </div>
  );
}

function GreetingCard({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    // 분 단위 갱신 — 날짜·시간대 인사 바뀔 때만 필요
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dateText = now ? formatDate(now) : "";
  const greeting = now ? greetingForHour(now.getHours()) : "";

  return (
    <div className="rounded-lg bg-card p-5">
      {/* placeholder   : mount 전에도 높이 유지 (레이아웃 흔들림 방지) */}
      <p className="text-xs text-muted">{dateText || " "}</p>
      <h2 className="mt-2 text-2xl leading-[1.2] font-black tracking-tighter text-fg">
        <span className="bg-gradient-to-r from-primary via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          {name}님,
        </span>
        <br />
        {greeting || " "} <span aria-hidden>👋</span>
      </h2>
    </div>
  );
}

function AttendanceCard() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = now
    ? [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join(" : ")
    : "-- : -- : --";

  // 근무 시간 · 출퇴근 : 지금은 모두 미출근 상태 mock
  const percent = 0;
  const checkedIn = "--:--";
  const checkedOut = "--:--";

  return (
    <div className="rounded-lg bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">오늘 근무</p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-muted">
          미출근
        </span>
      </div>
      <p className="mt-2 text-center text-4xl font-black tracking-tighter text-fg tabular-nums">
        {clock}
      </p>

      {/* 프로그레스 바 — 06:20 ~ 18:20 근무 구간, 현재 진행률 */}
      <div className="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted tabular-nums">06:20</span>
        <span className="font-semibold text-primary">{percent}%</span>
        <span className="text-muted tabular-nums">18:20</span>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-muted">출근</span>
          <span className="text-fg tabular-nums">{checkedIn}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted">퇴근</span>
          <span className="text-fg tabular-nums">{checkedOut}</span>
        </div>
      </div>
    </div>
  );
}

// 앱 진입 그리드 — 4열 x 2행. 각 셀 : 컬러 아이콘 + 라벨(+뱃지).
// href / onClick 은 각 화면 붙는 시점에 연결.
type AppItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
  badge?: number;
};
const APPS: AppItem[] = [
  { label: "업무", icon: ClipboardDocumentCheckIcon, tone: "text-primary", badge: 2 },
  { label: "프로젝트", icon: FolderOpenIcon, tone: "text-yellow-400", badge: 2 },
  { label: "회의록", icon: DocumentTextIcon, tone: "text-sky-400" },
  { label: "근태 월차", icon: ClockIcon, tone: "text-pink-400" },
  { label: "랭킹", icon: TrophyIcon, tone: "text-amber-400" },
  { label: "일정", icon: CalendarIcon, tone: "text-violet-400" },
  { label: "급여", icon: BanknotesIcon, tone: "text-emerald-400" },
  { label: "공지", icon: MegaphoneIcon, tone: "text-lime-400", badge: 1 },
];

function AppGridCard() {
  return (
    <div className="rounded-lg bg-card p-5">
      <div className="grid grid-cols-4 gap-y-5">
        {APPS.map((app) => (
          <AppTile key={app.label} {...app} />
        ))}
      </div>
    </div>
  );
}

function AppTile({ label, icon: Icon, tone, badge }: AppItem) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1.5 rounded-md py-1 transition-colors hover:bg-card-hover"
    >
      <span className="relative inline-flex">
        <Icon className={`size-5 ${tone}`} />
        {badge ? (
          <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </button>
  );
}

// 리스트 카드 공용 헤더 — 좌측 제목 + 카운트, 우측 "전체 →" 링크.
function ListCardHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h3 className="text-base font-bold text-fg">{title}</h3>
        <span className="text-sm text-muted tabular-nums">{count}</span>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg"
      >
        전체 <ArrowRightIcon className="size-4" />
      </button>
    </div>
  );
}

// 더 있음을 암시하는 페이드/스켈레톤 행 — 실제 로딩이 아니라 시각적 tease.
function TeaseRow() {
  return (
    <li className="flex items-center gap-3 pl-3">
      <span className="h-6 w-0.5 rounded-full bg-white/10" />
      <span className="h-2 w-1/2 rounded-full bg-white/10" />
    </li>
  );
}

// 오늘의 업무 카드 — 리스트 (컬러 라인 + 아이콘 + 라벨 + D-day/반복 뱃지)
type TaskBadgeTone = "primary" | "yellow";
interface TaskItem {
  label: string;
  emoji: string;
  accent: string;
  badge: string;
  badgeTone: TaskBadgeTone;
}
const TASKS: TaskItem[] = [
  { label: "환경정비", emoji: "🍚", accent: "bg-primary", badge: "반복", badgeTone: "primary" },
  { label: "ㅁㅁ", emoji: "📝", accent: "bg-yellow-400", badge: "D-4", badgeTone: "yellow" },
  { label: "테스트 프로젝트", emoji: "📝", accent: "bg-primary", badge: "D-45", badgeTone: "primary" },
];

function TodayTasksCard() {
  return (
    <div className="rounded-lg bg-card p-5">
      <ListCardHeader title="오늘의 업무" count={TASKS.length} />
      <ul className="mt-4 space-y-3">
        {TASKS.map((t, i) => (
          <li
            key={i}
            className="flex items-center gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0"
          >
            <span className={`h-8 w-1 rounded-full ${t.accent}`} />
            <span className="text-lg" aria-hidden>
              {t.emoji}
            </span>
            <span className="flex-1 truncate font-semibold text-fg">
              {t.label}
            </span>
            <TaskBadge tone={t.badgeTone}>{t.badge}</TaskBadge>
          </li>
        ))}
        <TeaseRow />
        <TeaseRow />
      </ul>
    </div>
  );
}

function TaskBadge({
  tone,
  children,
}: {
  tone: TaskBadgeTone;
  children: React.ReactNode;
}) {
  const cls =
    tone === "yellow"
      ? "bg-yellow-400/20 text-yellow-400"
      : "bg-primary/20 text-primary";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${cls}`}
    >
      {children}
    </span>
  );
}

// 공지 카드 — 고정 뱃지 + 제목 + 작성자/날짜 meta
interface NoticeItem {
  title: string;
  author: string;
  date: string;
  pinned?: boolean;
}
const NOTICES: NoticeItem[] = [
  { title: "ewqweew", author: "관리자", date: "7. 24.", pinned: true },
];

function NoticesCard() {
  return (
    <div className="rounded-lg bg-card p-5">
      <ListCardHeader title="공지" count={NOTICES.length} />
      <ul className="mt-4 space-y-3">
        {NOTICES.map((n, i) => (
          <li key={i} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2">
              {n.pinned && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-xs font-bold text-yellow-400">
                  <BoltIcon className="size-3" />
                  고정
                </span>
              )}
              <span className="font-semibold text-fg">{n.title}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {n.author} · {n.date}
            </p>
          </li>
        ))}
        <TeaseRow />
        <TeaseRow />
        <TeaseRow />
      </ul>
    </div>
  );
}
