"use client";

import {
  BellAlertIcon,
  BellSlashIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/providers/ToastProvider";
import { usePushNotifications } from "@/lib/usePushNotifications";

// 사이드바 하단의 "푸시 알림 켜기/끄기" 토글.
// 권한 거부·미지원·VAPID 미설정 환경에선 비활성 + 안내 텍스트.
export function PushToggle() {
  const toast = useToast();
  const { supported, permission, subscribed, isBusy, enable, disable } =
    usePushNotifications();

  // 미지원 환경(브라우저 자체 불가) — 토글 자체를 숨김
  if (!supported) return null;

  const blockedByDenial = permission === "denied";

  async function handleClick() {
    try {
      if (subscribed) {
        await disable();
        toast.success("푸시 알림이 꺼졌습니다.");
      } else {
        await enable();
        toast.success("푸시 알림이 켜졌습니다.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "푸시 알림 설정 실패");
    }
  }

  const label = subscribed ? "푸시 알림 끄기" : "푸시 알림 켜기";
  const Icon = subscribed ? BellAlertIcon : BellSlashIcon;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy || blockedByDenial}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon className="size-4" />
        {isBusy ? "처리 중…" : label}
      </button>
      {blockedByDenial && (
        <p className="mt-1 text-[11px] text-gray-500">
          브라우저 설정에서 알림을 허용해야 켤 수 있습니다.
        </p>
      )}
    </div>
  );
}
