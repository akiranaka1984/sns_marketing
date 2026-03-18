import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { toast } from "sonner";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { I18nProvider } from "./contexts/I18nContext";

/**
 * Convert a raw API/tRPC error message into a user-friendly Japanese string.
 * DB-level messages and stack traces are hidden from the user.
 */
function toUserMessage(error: unknown): string {
  if (!(error instanceof TRPCClientError)) {
    return "予期しないエラーが発生しました";
  }

  const msg = error.message ?? "";

  // DB connection / query failures — hide internal details
  if (
    msg.includes("Failed query") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ER_") ||
    msg.includes("connect ETIMEDOUT") ||
    msg.includes("Too many connections") ||
    msg.includes("Access denied")
  ) {
    return "サーバーに接続できませんでした。しばらく待ってから再試行してください";
  }

  // Network errors
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "ネットワークエラーが発生しました。接続を確認してください";
  }

  // Rate limit
  if (error.data?.httpStatus === 429) {
    return "リクエストが多すぎます。しばらく待ってから再試行してください";
  }

  // Server errors (500 range) — hide raw message
  if (error.data?.httpStatus != null && error.data.httpStatus >= 500) {
    return "サーバーエラーが発生しました。しばらく待ってから再試行してください";
  }

  // For client errors (4xx), surface the message as-is (it's intentional)
  return msg || "エラーが発生しました";
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Do NOT throw errors to the ErrorBoundary automatically for queries —
      // each page handles its own isError state for graceful fallback UI.
      throwOnError: false,
      // Retry once on failure; don't hammer a broken server.
      retry: 1,
      retryDelay: 1500,
    },
    mutations: {
      // Mutations never propagate to ErrorBoundary either.
      throwOnError: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
    // Query errors are handled at page level (isError state + fallback UI).
    // We intentionally do NOT show a global toast here to avoid noise.
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);

    // Show a user-friendly toast for mutation errors that were not handled
    // individually by the caller's onError callback.
    const hasCustomHandler =
      typeof (event.mutation.options as { onError?: unknown }).onError === "function";
    if (!hasCustomHandler) {
      toast.error(toUserMessage(error));
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
