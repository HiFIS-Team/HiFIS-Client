// HiFIS-Server-V2 응답 타입 (backend-api.md §13).
// 백엔드 계약은 camelCase — 여기도 그대로.

export type Role = "ADMIN" | "MANAGER" | "MEMBER";
export type Rank =
  | "JUNIOR_TRAINER"
  | "PRO_TRAINER"
  | "PRO1_TRAINER"
  | "TEAM_LEAD"
  | "STORE_MANAGER"
  | "FC";
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
  joinedAt: string;
  lastActiveAt?: string;
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
