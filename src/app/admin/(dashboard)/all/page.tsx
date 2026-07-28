"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { clearTokens } from "@/lib/api/tokenStore";
import { useToast } from "@/providers/ToastProvider";
import { NAV_ICONS } from "../navIcons";
import { PageTitle } from "../PageTitle";

// 모바일 하단 탭의 "전체" — 사이드바 항목들을 그룹별 앱 그리드로 노출.
// PC 는 이미 사이드바가 있어 이 페이지가 굳이 필요 없지만, URL 직접 진입 시엔 그대로 보임.

interface Item {
  href: string;
  label: string;
  tone: string; // 컬러 아이콘 팔레트 (홈 AppShortcutCard 톤 통일)
  action?: "logout";
}
interface Group {
  label: string;
  items: Item[];
}

const GROUPS: Group[] = [
  {
    label: "업무",
    items: [
      { href: "/admin/schedule", label: "일정", tone: "text-violet-400" },
      { href: "/admin/tasks", label: "업무", tone: "text-primary" },
      { href: "/admin/projects", label: "프로젝트", tone: "text-yellow-400" },
      { href: "/admin/approvals", label: "결재", tone: "text-blue-400" },
      { href: "/admin/meetings", label: "회의록", tone: "text-sky-400" },
      { href: "/admin/attendance", label: "근태", tone: "text-pink-400" },
      { href: "/admin/documents", label: "문서함", tone: "text-orange-400" },
    ],
  },
  {
    label: "커뮤니케이션",
    items: [
      { href: "/admin/notices", label: "공지", tone: "text-lime-400" },
    ],
  },
  {
    label: "인사",
    items: [
      { href: "/admin/accounts", label: "계정관리", tone: "text-emerald-400" },
      { href: "/admin/staff", label: "직원", tone: "text-cyan-400" },
      { href: "/admin/payroll", label: "급여", tone: "text-green-400" },
      { href: "/admin/ranking", label: "랭킹", tone: "text-amber-400" },
    ],
  },
  {
    label: "계정",
    items: [
      { href: "/admin/profile", label: "프로필", tone: "text-fuchsia-400" },
      { href: "/admin/guide", label: "앱 가이드", tone: "text-indigo-400" },
      {
        href: "/admin/logout",
        label: "로그아웃",
        tone: "text-red-400",
        action: "logout",
      },
    ],
  },
];

export default function AllPage() {
  return (
    <div>
      <PageTitle title="전체" />
      <h1 className="text-2xl font-black tracking-tighter text-fg">전체</h1>
      <p className="mt-1 text-sm text-muted">
        모든 앱을 한 곳에서 열어볼 수 있어요.
      </p>

      <div className="mt-6 space-y-4">
        {GROUPS.map((g) => (
          <GroupCard key={g.label} group={g} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <section className="rounded-lg border border-line bg-card px-6 py-5">
      <h3 className="text-xs font-semibold text-muted">{group.label}</h3>
      <div className="mt-4 grid grid-cols-4 gap-y-5">
        {group.items.map((item) => (
          <Tile key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}

function Tile({ item }: { item: Item }) {
  const router = useRouter();
  const toast = useToast();
  const Icon = NAV_ICONS[item.href] as
    | ComponentType<SVGProps<SVGSVGElement>>
    | undefined;

  const baseClass =
    "inline-flex flex-col items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-card-hover";
  const label = (
    <>
      {Icon ? <Icon className={`size-5 ${item.tone}`} /> : null}
      <span className="whitespace-nowrap text-sm text-muted">{item.label}</span>
    </>
  );

  if (item.action === "logout") {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            clearTokens();
            toast.success("로그아웃되었습니다.");
            router.replace("/admin/login");
          }}
          className={baseClass}
        >
          {label}
        </button>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <Link href={item.href} className={baseClass}>
        {label}
      </Link>
    </div>
  );
}
