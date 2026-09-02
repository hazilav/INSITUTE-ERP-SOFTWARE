import { formatErrorMessage } from "./errors";

interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number; // ms
  deduplicate?: boolean;
}

// In-flight request deduplication map to prevent duplicate concurrent API requests
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Robust fetch wrapper with exponential backoff retries for 5xx and network errors.
 * Strictly NEVER retries 4xx client errors (validation, 401 authentication, 403 authorization, 404, etc).
 * Includes concurrent in-flight request deduplication and infinite-redirect protection.
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const method = (options.method || "GET").toUpperCase();
  const shouldDeduplicate = (options.deduplicate ?? true) && method === "GET" && !options.signal;
  const cacheKey = shouldDeduplicate ? `${method}:${url}` : null;

  if (cacheKey && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const requestPromise = executeFetchWithRetry<T>(url, options);

  if (cacheKey) {
    inFlightRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => {
      inFlightRequests.delete(cacheKey);
    });
  }

  return requestPromise;
}

async function executeFetchWithRetry<T = any>(
  url: string,
  options: FetchWithRetryOptions
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const { retries = 2, retryDelay = 400, ...fetchOptions } = options;

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized / Session Expired safely without infinite loops
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          const pathname = window.location.pathname;
          const isLoginPage =
            pathname.startsWith("/login") ||
            pathname.startsWith("/student/login") ||
            pathname.startsWith("/register");

          if (!isLoginPage) {
            const isStudent = pathname.startsWith("/student");
            const targetLogin = isStudent ? "/student/login?expired=true" : "/login?expired=true";

            // Avoid repeated redirects if already navigating
            if (!sessionStorage.getItem("is_redirecting_auth")) {
              sessionStorage.setItem("is_redirecting_auth", "1");
              const currentPath = pathname + window.location.search;
              if (!currentPath.includes("login") && !currentPath.includes("logout")) {
                sessionStorage.setItem("redirect_after_login", currentPath);
              }
              window.location.href = targetLogin;
            }
          }
        }
        return {
          ok: false,
          status: 401,
          data: null as any,
          error: "Your session has expired. Please log in again.",
        };
      }

      // Strictly NEVER retry 4xx errors (validation 400, auth 401, forbidden 403, not found 404, conflict 409, 422)
      if (response.status >= 400 && response.status < 500) {
        const contentType = response.headers.get("content-type");
        let errorData: any = null;
        if (contentType && contentType.includes("application/json")) {
          try {
            errorData = await response.json();
          } catch {
            errorData = null;
          }
        }
        const errorMsg = formatErrorMessage(
          errorData?.error || errorData?.message || `Request failed with status ${response.status}`
        );
        return {
          ok: false,
          status: response.status,
          data: errorData,
          error: errorMsg,
        };
      }

      // If status is 5xx server error, retry with exponential backoff
      if (response.status >= 500 && attempt < retries) {
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
        );
        continue;
      }

      // Parse response body safely
      const contentType = response.headers.get("content-type");
      let data: any = null;
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = formatErrorMessage(
          data?.error || data?.message || data || `Server error (${response.status})`
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
      // AbortError should not be retried
      if (err?.name === "AbortError") {
        return {
          ok: false,
          status: 0,
          data: null as any,
          error: "Request was cancelled.",
        };
      }

      if (attempt < retries) {
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
        );
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

