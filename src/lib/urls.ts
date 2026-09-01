/**
 * Domain-configurable URL resolution and native sharing helpers for CRM Portals.
 */

export function getBaseUrl(customDomain?: string | null): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (customDomain && customDomain.startsWith("http")) {
    return customDomain;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getStudentPortalUrl(customDomain?: string | null): string {
  const base = getBaseUrl(customDomain);
  return `${base}/student/login`;
}

export function getStaffPortalUrl(customDomain?: string | null): string {
  const base = getBaseUrl(customDomain);
  return `${base}/login`;
}

export async function sharePortalLink(
  title: string,
  text: string,
  url: string,
  onCopyFallback?: () => void
): Promise<void> {
  const fullShareText = `${text}\n${url}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Native share failed, falling back to clipboard copy", err);
      } else {
        return;
      }
    }
  }

  // Desktop / Clipboard fallback
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(fullShareText);
    if (onCopyFallback) onCopyFallback();
  }
}
