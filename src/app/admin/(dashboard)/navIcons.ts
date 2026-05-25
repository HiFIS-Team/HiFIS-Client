import type { ComponentType } from "react";
import {
  BoltIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  Squares2X2Icon,
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
  "/admin/messages": ChatBubbleLeftRightIcon,
  "/admin/admins": UserGroupIcon,
};
