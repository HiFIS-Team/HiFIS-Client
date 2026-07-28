import { apiV2Fetch } from "./client";
import type {
  EmployeeOut,
  EmployeeStatus,
  Rank,
  Role,
  WorkStatus,
} from "./types";

// GET /employees — backend-api.md §5.
// 지점 스코프는 백엔드가 자동 (MEMBER=본인 지점, MANAGER·ADMIN=전체).
// undefined 는 쿼리에서 제외.

export interface ListEmployeesParams {
  branchId?: string;
  status?: EmployeeStatus;
  role?: Role;
  team?: string;
  q?: string;
}

export function listEmployees(
  params: ListEmployeesParams = {},
): Promise<EmployeeOut[]> {
  const qs = new URLSearchParams();
  if (params.branchId) qs.set("branchId", params.branchId);
  if (params.status) qs.set("status", params.status);
  if (params.role) qs.set("role", params.role);
  if (params.team) qs.set("team", params.team);
  if (params.q) qs.set("q", params.q);
  const query = qs.toString();
  return apiV2Fetch<EmployeeOut[]>(
    `/employees${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

// ─────────────── /employees/me ───────────────

export interface EmployeeMeUpdate {
  name?: string;
  avatarColor?: string;
  avatarUrl?: string;
  statusMessage?: string | null;
  workStatus?: WorkStatus;
}

export function updateMe(payload: EmployeeMeUpdate): Promise<EmployeeOut> {
  return apiV2Fetch<EmployeeOut>(`/employees/me`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(payload: PasswordChange): Promise<void> {
  return apiV2Fetch<void>(`/employees/me/password`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

// multipart 아바타 업로드. 서버가 avatarUrl 채워서 EmployeeOut 리턴.
export function uploadMyAvatar(file: File): Promise<EmployeeOut> {
  const fd = new FormData();
  fd.append("file", file);
  return apiV2Fetch<EmployeeOut>(`/employees/me/avatar`, {
    method: "POST",
    body: fd,
    auth: true,
  });
}

export function withdrawMe(): Promise<void> {
  return apiV2Fetch<void>(`/employees/me/withdraw`, {
    method: "POST",
    auth: true,
  });
}

// ─────────────── 라벨 매핑 ───────────────

const RANK_LABEL: Record<Rank, string> = {
  TRAINER: "트레이너",
  FC: "FC",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  DEVELOPER: "개발자",
  CEO: "대표",
};
export function rankLabel(r: Rank): string {
  return RANK_LABEL[r] ?? r;
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
};
export function roleLabel(r: Role): string {
  return ROLE_LABEL[r] ?? r;
}

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "비활성",
  RESIGNED: "퇴사",
};
export function statusLabel(s: EmployeeStatus): string {
  return STATUS_LABEL[s] ?? s;
}

// 백엔드 avatarColor (색 이름 또는 hex) → Tailwind bg 클래스.
// 안전 상 정해진 색만 매핑, 미정의 값은 fallback (bg-primary).
const AVATAR_TONE_MAP: Record<string, string> = {
  violet: "bg-violet-500",
  purple: "bg-primary",
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  green: "bg-emerald-500",
  sky: "bg-sky-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  rose: "bg-pink-500",
  neutral: "bg-neutral-500",
  gray: "bg-neutral-500",
};
export function avatarTone(color: string | undefined | null): string {
  if (!color) return "bg-primary";
  return AVATAR_TONE_MAP[color.toLowerCase()] ?? "bg-primary";
}

// ISO → "2026. 7. 22." (백엔드가 timezone 있는 UTC 로 주므로 Date 로 파싱).
export function formatDateDot(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

// ISO → 상대 시간 라벨. null·없음이면 "기록 없음".
export function formatRelative(
  iso: string | undefined | null,
  now: Date,
): string {
  if (!iso) return "기록 없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "기록 없음";
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}주 전`;
  return formatDateDot(iso);
}
