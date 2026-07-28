// HiFIS-Server-V2 응답 타입 (backend-api.md §13).
// 백엔드 계약은 camelCase — 여기도 그대로.

export type Role = "ADMIN" | "MANAGER" | "MEMBER";
// 백엔드 app/enums.py 기준 (2026-07). 프론트가 임의 값을 만들지 말 것.
export type Rank =
  | "TRAINER"
  | "FC"
  | "TEAM_LEAD"
  | "STORE_MANAGER"
  | "DEVELOPER"
  | "CEO";
export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "RESIGNED";
export type WorkStatus = "AUTO" | "MEETING" | "MEAL" | "OUT" | "AWAY";

export interface EmployeeOut {
  id: string;
  name: string;
  email: string;
  phone?: string;
  empNo?: string;
  branchId: string;
  rank: Rank;
  role: Role;
  team?: string;
  status: EmployeeStatus;
  avatarColor: string;
  avatarUrl?: string;
  statusMessage?: string;
  workStatus: WorkStatus;
  joinedAt: string; // ISO
  lastActiveAt?: string; // ISO
  shiftStart?: string; // "HH:MM"
  shiftEnd?: string; // "HH:MM"
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  employee: EmployeeOut;
}

export interface RefreshResponse {
  accessToken: string;
}

export type SignupResult = "JOINED" | "PENDING";
export interface SignupResponse {
  result: SignupResult;
}
