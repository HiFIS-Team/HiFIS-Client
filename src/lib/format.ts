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
