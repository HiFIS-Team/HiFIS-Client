import { apiV2Fetch } from "./client";

// 근태 · 휴가 — backend-api.md §9.
// scan : 하루 첫 번째 = 출근 · 다음 = 퇴근 (근무시간 자동).
// list : 지점 스코프 자동 (MEMBER 는 본인 지점).
// createLeave : 본인 신청. cancel : PENDING 만.

export type AttendanceSource = "BARCODE" | "MANUAL";
export type LeaveType = "ANNUAL" | "HALF" | "SICK" | "FIELD" | "ETC";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface AttendanceOut {
  id: string;
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  checkIn: string | null; // ISO datetime
  checkOut: string | null;
  workMinutes: number | null;
  source: AttendanceSource;
}

export interface LeaveRequestOut {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  days: number; // 0.5 (반차) 또는 정수
  reason: string | null;
  rejectReason: string | null;
  status: LeaveStatus;
}

export interface AttendanceScanRequest {
  code?: string; // 사번 스캔 — 생략 시 본인 스캔
}

export function scanAttendance(
  payload: AttendanceScanRequest = {},
): Promise<AttendanceOut> {
  return apiV2Fetch<AttendanceOut>(`/attendance/scan`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export interface ListAttendanceParams {
  employeeId?: string;
  month?: string; // "YYYY-MM"
}

export function listAttendance(
  params: ListAttendanceParams = {},
): Promise<AttendanceOut[]> {
  const qs = new URLSearchParams();
  if (params.employeeId) qs.set("employeeId", params.employeeId);
  if (params.month) qs.set("month", params.month);
  const query = qs.toString();
  return apiV2Fetch<AttendanceOut[]>(
    `/attendance${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

export interface LeaveRequestCreate {
  type: LeaveType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  reason?: string;
}

export function createLeave(
  payload: LeaveRequestCreate,
): Promise<LeaveRequestOut> {
  return apiV2Fetch<LeaveRequestOut>(`/leaves`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export interface ListLeavesParams {
  employeeId?: string;
  status?: LeaveStatus;
}

export function listLeaves(
  params: ListLeavesParams = {},
): Promise<LeaveRequestOut[]> {
  const qs = new URLSearchParams();
  if (params.employeeId) qs.set("employeeId", params.employeeId);
  if (params.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiV2Fetch<LeaveRequestOut[]>(
    `/leaves${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

// PENDING 만 취소 가능. 본인만.
export function cancelLeave(id: string): Promise<LeaveRequestOut> {
  return apiV2Fetch<LeaveRequestOut>(`/leaves/${id}/cancel`, {
    method: "POST",
    auth: true,
  });
}

// ─────────────── 라벨 매핑 ───────────────

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: "연차",
  HALF: "반차",
  SICK: "병가",
  FIELD: "외근",
  ETC: "기타",
};
export function leaveTypeLabel(t: LeaveType): string {
  return LEAVE_TYPE_LABEL[t] ?? t;
}

const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
  CANCELLED: "취소",
};
export function leaveStatusLabel(s: LeaveStatus): string {
  return LEAVE_STATUS_LABEL[s] ?? s;
}

// "9h 16m" 표기 — 근무 분 → 시간+분.
export function formatWorkDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// "오전 09:07" / "오후 05:30" 표기.
export function formatCheckTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${String(h12).padStart(2, "0")}:${m}`;
}

// "YYYY-MM-DD" → "MM-DD" + 요일 한 글자.
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
export function parseDateParts(dateStr: string): { md: string; dow: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const mm = String(m ?? 0).padStart(2, "0");
  const dd = String(d ?? 0).padStart(2, "0");
  return {
    md: `${mm}-${dd}`,
    dow: Number.isNaN(dt.getTime()) ? "" : WEEKDAY_KO[dt.getDay()],
  };
}
