// 백엔드(HiFIS-Server) 스키마에 대응하는 타입.
// 정식 출처는 백엔드 app/schemas/ — 변경 시 함께 맞출 것.

// --- 페이지네이션 envelope (고볼륨 list 응답) ---
// 회원/PT/예약/알림톡 4개 list 엔드포인트가 사용. 카운트·차트 등 집계는 /admin/dashboard/summary 로.
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- 지점 ---
export interface Branch {
  id: string;
  name: string;
  phone: string;
  kakao_url: string | null;
  naver_place_url: string | null;
  // 알림톡 발송자 — 지점 소속 admin 중 하나 (없으면 null)
  messenger_admin_id: string | null;
  messenger: {
    id: string;
    name: string;
    position: string;
  } | null;
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
  // 알림톡 발송 종류·출처 — 알림톡 이력 화면에서 사용
  trigger_type: EnumOption[];
  source_type: EnumOption[];
  // 관리자 직책 (점장/팀장/트레이너/FC) — 회원가입 시 선택
  position: EnumOption[];
}

// --- 상품(회원권·수강권·락커·운동복) — 4종 모두 동일 형태 ---
// provides_locker / provides_clothes 는 회원권·수강권에만 존재 (락커·운동복 패스 응답엔 없음).
// true 이면 신청 시 별도 락커/운동복 선택을 차단하고 자동 포함 — 백엔드가 검증 (400).
export interface Pass {
  id: string;
  branch_id: string;
  name: string;
  cash_price: number;
  card_price: number;
  provides_locker?: boolean;
  provides_clothes?: boolean;
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
  // referral 이 OTHER 일 때 사용자가 자유 입력한 텍스트 (최대 100자, 비어있으면 null)
  referral_detail: string | null;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  motivation: string;
  agreed_terms: boolean;
  // 마케팅 정보 수신 동의 (선택) — 만기 알림톡 등 마케팅성 트리거에만 영향
  agreed_marketing: boolean;
}
// NEW = 회원가입/PT 신청서로 처음 등록, EXISTING = 재등록 endpoint 거친 사람.
// 어드민 상세 다이얼로그에서 신규/기존 배지로 노출.
export type RegistrationCategory = "NEW" | "EXISTING";

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
  referral_detail: string | null;
  payment_method: string;
  // 이번(마지막) 결제 금액. 재등록 시 새 값으로 덮어씀.
  final_price: number;
  // 누적 결제 금액 (신규=final_price 동일, 재등록 시 += 이번 결제).
  total_paid: number | null;
  start_date: string;
  end_date: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  motivation: string;
  agreed_marketing: boolean;
  status: string;
  category: RegistrationCategory;
  created_at: string;
}

// GET /registrations/lookup — 재등록 사전 조회 (공개).
// branch_id+name+phone 으로 기존 회원/PT 신청 lookup. kinds 가 빈 배열이면 못 찾음.
export type RegistrationKind = "MEMBER" | "PT";
export type RenewalStatus = "REGISTERED" | "HELD" | "EXPIRED";
// 공통 prefill 정보 — 회원(membership_pass_id) vs PT(pt_pass_id) 만 다르고 나머지 동일
interface RenewalLookupCommon {
  id: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  payment_method: string | null;
  final_price: number | null;
  // 누적 결제 금액 — 안내 banner 등에 노출 가능
  total_paid: number | null;
  start_date: string;
  end_date: string;
  status: RenewalStatus;
  agreed_marketing: boolean;
}
export interface MemberLookup extends RenewalLookupCommon {
  membership_pass_id: string;
}
export interface PTLookup extends RenewalLookupCommon {
  pt_pass_id: string;
}
export interface RegistrationLookupResponse {
  kinds: RegistrationKind[];
  member: MemberLookup | null;
  pt: PTLookup | null;
}

// POST /members/re-register — 재등록 (공개).
// branch_id+name+phone 으로 기존 회원을 식별하고 새 회원권·결제 정보로 갱신한다.
// 기본 개인정보(성별/생일/주소/유입경로/방문목적)는 그대로 유지 → 폼에서 받지 않음.
// agreed_marketing 은 null 이면 기존 값 유지, true/false 면 갱신.
export interface MemberReRegister {
  branch_id: string;
  name: string;
  phone: string;
  membership_pass_id: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  payment_method: string;
  // 이번 결제 금액 — 서버 측에서 기존 final_price 에 누적됨
  final_price: number;
  start_date: string;
  end_date: string;
  // null = 기존 값 유지, true/false = 새로 설정
  agreed_marketing: boolean | null;
}

// PATCH /admin/members/{id} 요청 (수정 — 폼에서 전체 필드 전송)
export interface MemberUpdate {
  membership_pass_id: string;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  referral_detail: string | null;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  motivation: string;
  agreed_marketing: boolean;
}

// --- PT 신청 (POST /pt-applications) ---
export interface PTApplicationCreate {
  branch_id: string;
  pt_pass_id: string;
  // PT 무료 제공 락커/운동복 — 0원 상품으로 admin이 등록하면 회원이 선택. null = 사용 안 함
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  referral_detail: string | null;
  motivation: string;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  notes: string | null;
  agreed_notice: boolean;
  // 마케팅 정보 수신 동의 (선택)
  agreed_marketing: boolean;
}
export interface PTApplication {
  id: string;
  branch_id: string;
  pt_pass_id: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  referral_detail: string | null;
  motivation: string;
  payment_method: string;
  // 이번(마지막) 결제 금액 / 누적 결제 금액 — Member 와 동일 규칙
  final_price: number;
  total_paid: number | null;
  start_date: string;
  end_date: string;
  notes: string | null;
  agreed_marketing: boolean;
  status: string;
  category: RegistrationCategory;
  created_at: string;
}

// POST /pt-applications/re-register — PT 재등록 (공개).
// 회원 재등록과 동일한 식별 규칙(branch+name+phone). PT는 40일 고정 — 시작일은
// 활성이면 기존 end_date + 1일, 만료면 오늘. 프론트에서 계산해 start/end 전송.
export interface PTApplicationReRegister {
  branch_id: string;
  name: string;
  phone: string;
  pt_pass_id: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  agreed_marketing: boolean | null;
}

// PATCH /admin/pt-applications/{id} 요청 (수정)
export interface PTApplicationUpdate {
  pt_pass_id: string;
  locker_pass_id: string | null;
  clothes_pass_id: string | null;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  address: string;
  referral: string;
  referral_detail: string | null;
  motivation: string;
  payment_method: string;
  final_price: number;
  start_date: string;
  end_date: string;
  notes: string | null;
  agreed_marketing: boolean;
}

// --- 관리자 (인증) ---
export type AdminRole = "SUPER_ADMIN" | "FC";
export type AdminStatus = "PENDING_EMAIL" | "PENDING_APPROVAL" | "ACTIVE";

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  // 직책 — SUPER_ADMIN 은 null, FC 는 점장/팀장/트레이너/FC 중 하나
  position: string | null;
  status: AdminStatus;
  branch_id: string | null;
  created_at: string;
  // 마지막 heartbeat 시각 (없으면 한 번도 접속한 적 없음).
  // 프론트가 /admin/me/heartbeat 를 60초마다 ping → 백엔드가 갱신.
  last_seen_at: string | null;
  // 5분 이내 heartbeat 가 있으면 true — 백엔드 계산값 (서버 시계 기준).
  is_online: boolean;
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
  // 직책 (점장/팀장/트레이너/FC) — 백엔드 Position enum
  position: string;
}

// --- 알림톡 이력 (GET /admin/messages) ---
export interface Message {
  id: string;
  branch_id: string;
  source_type: string;
  source_id: string;
  recipient: string;
  trigger_type: string;
  content: string;
  status: string; // SUCCESS | FAIL
  sent_at: string;
}

// --- 대시보드 집계 (GET /admin/dashboard/summary) ---
// 4개 list 엔드포인트를 일일이 호출하지 않고 한 번에 집계 데이터를 받는다.
// 회원·PT 1000건 이상 누적된 운영 환경에서도 대시보드가 정확하게 동작하도록 백엔드가 직접 계산.
export interface DayCount {
  date: string; // YYYY-MM-DD
  count: number;
}
export interface BirthdayItem {
  id: string;
  name: string;
  phone: string;
}
export interface RecentItem {
  id: string;
  name: string;
  branch_id: string;
  created_at: string;
}
export interface MemberSummary {
  total: number;
  by_status: Record<string, number>; // REGISTERED / HELD / EXPIRED
  this_month_signups: number;
  this_month_by_day: DayCount[]; // 0건인 날은 생략 — 프론트가 채움
  birthday_today: BirthdayItem[];
  by_gender: Record<string, number>; // M / F
  by_age_range: Record<string, number>; // 10s / 20s / 30s / 40s / 50s_plus
  expiring_soon_count: number;
  recent: RecentItem[];
  by_membership_pass: Record<string, number>; // 활성(REGISTERED+HELD) 이용자, pass_id → count
}
export interface PTApplicationSummary {
  total: number;
  by_status: Record<string, number>;
  this_month_signups: number;
  this_month_by_day: DayCount[];
  recent: RecentItem[];
  expiring_soon_count: number;
  by_pt_pass: Record<string, number>;
}
export interface ReservationSummary {
  total: number;
  this_month: number;
  today_visit: number;
  recent: RecentItem[];
}
export interface MessageSummary {
  total: number;
  today: number;
}
export interface DashboardSummary {
  members: MemberSummary;
  pt_applications: PTApplicationSummary;
  reservations: ReservationSummary;
  messages: MessageSummary;
}
