import type { ComponentType } from "react";
import {
  HomeIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  UsersIcon,
  BanknotesIcon,
  TrophyIcon,
  UserCircleIcon,
  BookOpenIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

// 사이드바·페이지 제목에 공유되는 메뉴별 아이콘 — 한 곳에서 관리해야 일치 보장.
// v2 재편으로 회원/PT/예약/상품/통계/알림톡 계열 제거, 새 18개 도메인 아이콘으로 교체.
export const NAV_ICONS: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  "/admin": HomeIcon,
  "/admin/schedule": CalendarIcon,
  "/admin/tasks": ClipboardDocumentCheckIcon,
  "/admin/projects": FolderIcon,
  "/admin/approvals": DocumentCheckIcon,
  "/admin/meetings": DocumentTextIcon,
  "/admin/attendance": ClockIcon,
  "/admin/documents": ArchiveBoxIcon,
  "/admin/accounts": ShieldCheckIcon,
  "/admin/notices": MegaphoneIcon,
  "/admin/chat": ChatBubbleLeftRightIcon,
  "/admin/notifications": BellIcon,
  "/admin/staff": UsersIcon,
  "/admin/payroll": BanknotesIcon,
  "/admin/ranking": TrophyIcon,
  "/admin/profile": UserCircleIcon,
  "/admin/guide": BookOpenIcon,
  "/admin/logout": ArrowRightStartOnRectangleIcon,
};
