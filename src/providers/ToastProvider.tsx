"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ToastType = "success" | "error";

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// 어디서든 toast.success("...") / toast.error("...") 로 알림을 띄운다.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast 는 ToastProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}

// 토스트 자동 사라짐 (ms)
const DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => remove(id), DURATION);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (m) => add("success", m),
      error: (m) => add("error", m),
    }),
    [add],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* 화면 오른쪽 위에 쌓이는 토스트 */}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastData;
  onClose: () => void;
}) {
  const isSuccess = toast.type === "success";
  return (
    <div className="animate-toast-in pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-lg">
      {isSuccess ? (
        <CheckCircleIcon className="size-5 shrink-0 text-green-500" />
      ) : (
        <XCircleIcon className="size-5 shrink-0 text-red-500" />
      )}
      <p className="flex-1 text-sm text-fg">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="shrink-0 text-muted hover:text-fg"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}
