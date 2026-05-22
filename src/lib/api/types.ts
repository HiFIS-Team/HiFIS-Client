// 백엔드(HiFIS-Server) 스키마에 대응하는 타입.
// 정식 출처는 백엔드 app/schemas/ — 변경 시 함께 맞출 것.

// --- 지점 ---
export interface Branch {
  id: string;
  name: string;
  phone: string;
  kakao_url: string | null;
  naver_place_url: string | null;
  created_at: string;
}

// --- enum 옵션 (GET /enums) ---
export interface EnumOption {
  code: string;
  label: string;
}

export interface Enums {
  gender: EnumOption[];
  referral: EnumOption[];
  payment_method: EnumOption[];
  motivation: EnumOption[];
}

// --- 상품(회원권·수강권·락커·운동복) — 4종 모두 동일 형태 ---
export interface Pass {
  id: string;
  branch_id: string;
  name: string;
  cash_price: number;
  card_price: number;
  created_at: string;
}

// --- 예약 (POST /reservations) ---
export interface ReservationCreate {
  branch_id: string;
  name: string;
  phone: string;
  visit_date: string;
}
export interface Reservation {
  id: string;
  branch_id: string;
  name: string;
  phone: string;
  visit_date: string;
  created_at: string;
}

// --- 회원가입 신청 (POST /members) ---
export interface MemberCreate {
  branch_id: string;
  membership_pass_id: string;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  motivation: string;
  agreed_terms: boolean;
}
export interface Member {
  id: string;
  branch_id: string;
  membership_pass_id: string;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  motivation: string;
  status: string;
  created_at: string;
}

// --- PT 신청 (POST /pt-applications) ---
export interface PTApplicationCreate {
  branch_id: string;
  pt_pass_id: string;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  notes: string | null;
  agreed_notice: boolean;
}
export interface PTApplication {
  id: string;
  branch_id: string;
  pt_pass_id: string;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  notes: string | null;
  status: string;
  created_at: string;
}

// --- 관리자 (인증) ---
export type AdminRole = "SUPER_ADMIN" | "FC";
export type AdminStatus = "PENDING_EMAIL" | "PENDING_APPROVAL" | "ACTIVE";

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;
  branch_id: string | null;
  created_at: string;
}

// POST /admin/login·/refresh 응답
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  admin: Admin;
}

// POST /admin/signup 요청 (FC 셀프 회원가입)
export interface AdminSignupRequest {
  email: string;
  name: string;
  password: string;
  branch_id: string;
}
