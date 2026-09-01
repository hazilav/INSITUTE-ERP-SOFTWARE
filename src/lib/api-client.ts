import { formatErrorMessage } from "./errors";

interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number; // ms
}

/**
 * Robust fetch wrapper with exponential backoff retries for 5xx and network errors,
 * automatic 401 Unauthorized session expiry redirection, and safe error messages.
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const { retries = 2, retryDelay = 400, ...fetchOptions } = options;

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized / Session Expired
      if (response.status === 401) {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          const currentPath = window.location.pathname + window.location.search;
          if (!currentPath.includes("login") && !currentPath.includes("logout")) {
            sessionStorage.setItem("redirect_after_login", currentPath);
          }
          window.location.href = "/login?expired=true";
        }
        return {
          ok: false,
          status: 401,
          data: null as any,
          error: "Your session has expired. Redirecting to login...",
        };
      }

      // If status is 5xx or server error, decide whether to retry
      if (response.status >= 500 && attempt < retries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
        continue;
      }

      const contentType = response.headers.get("content-type");
      let data: any = null;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = formatErrorMessage(
          data?.error || data?.message || data || `Request failed with status ${response.status}`
        );
        return {
          ok: false,
          status: response.status,
          data,
          error: errorMsg,
        };
      }

      return {
        ok: true,
        status: response.status,
        data,
      };
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
      } else {
        break;
      }
    }
  }

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const userMessage = isOffline
    ? "You appear to be offline. Please check your internet connection."
    : formatErrorMessage(lastError, "Temporary server or network issue. Please try again.");

  return {
    ok: false,
    status: 0,
    data: null as any,
    error: userMessage,
  };
}
