import type { ComponentType } from "react";
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  ChartBarIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CubeIcon,
  HeartIcon,
  NewspaperIcon,
  ScaleIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrophyIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

// 사이드바·페이지 제목에 공유되는 메뉴별 아이콘 — 한 곳에서 관리해야 일치 보장.
export const NAV_ICONS: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  "/admin": Squares2X2Icon,
  "/admin/reservations": CalendarIcon,
  "/admin/members": UsersIcon,
  "/admin/pt-applications": BoltIcon,
  "/admin/passes": CubeIcon,
  "/admin/branches": BuildingOffice2Icon,
  "/admin/stats": ChartBarIcon,
  "/admin/pass-sales": ChartPieIcon,
  "/admin/registration-mix": ArrowsRightLeftIcon,
  "/admin/membership-expiry": ClockIcon,
  "/admin/alimtalk-templates": AdjustmentsHorizontalIcon,
  "/admin/messages": ChatBubbleLeftRightIcon,
  "/admin/admins": UserGroupIcon,
  "/admin/release-notes": NewspaperIcon,
  // 직원 관리 — 준비중 메뉴들. 실제 페이지는 아직 없음.
  "/admin/staff/facility-care": SparklesIcon,
  "/admin/staff/peer-review": ScaleIcon,
  "/admin/staff/kindness": HeartIcon,
  "/admin/staff/classes": AcademicCapIcon,
  "/admin/staff/contribution": TrophyIcon,
};
