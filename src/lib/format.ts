// 화면 표시용 포맷 헬퍼

// 전화번호 숫자 → 하이픈 형식
export function formatPhone(value: string): string {
  const n = value.replace(/\D/g, "");
  if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  return value;
}

// ISO 날짜/일시 → 한국어 날짜 (예: 2026. 5. 26.)
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR");
}

// 숫자 → "290,000원"
export function formatWon(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

// ISO 일시 → 한국어 날짜+시각
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ISO 일시 → 상대 시간 ("방금 전", "5분 전", "3시간 전", "2일 전") — 알림 등에 사용
export function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return formatDate(iso);
}
