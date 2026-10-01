"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  correlationId?: string;
}

const ToastContext = createContext<{
  toast: (message: string, tone?: ToastTone, correlationId?: string) => void;
} | null>(null);

let nextId = 1;

const toneStyles: Record<ToastTone, string> = {
  success: "border-green-300 bg-green-50 text-green-900",
  error: "border-red-300 bg-red-50 text-red-900",
  info: "border-blue-300 bg-blue-50 text-blue-900",
};

/** AxioToast — minimal toast provider. Render <AxioToasts/> once near the shell root. */
export function AxioToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info", correlationId?: string) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, tone, correlationId }]);
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 6000);
    },
    [],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-axio-md ${toneStyles[t.tone]}`}
          >
            <p>{t.message}</p>
            {t.correlationId && (
              <p className="mt-1 font-mono text-xs opacity-80">
                Correlation ID: {t.correlationId}
              </p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <AxioToastProvider>");
  return ctx.toast;
}
