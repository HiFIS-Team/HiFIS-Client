// 회원·PT 신청 상태 배지 — REGISTERED(유효) / EXPIRED(만료)
export function StatusBadge({ status }: { status: string }) {
  const active = status === "REGISTERED";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {active ? "유효" : "만료"}
    </span>
  );
}
