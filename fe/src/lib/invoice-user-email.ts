type StoredAuthUser = {
  email?: string;
  data?: { email?: string; [key: string]: unknown };
  user?: { email?: string; [key: string]: unknown };
  [key: string]: unknown;
};

function readStoredAuth(): StoredAuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const key = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "authUser";
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

/** Full logged-in Invoice user object from localStorage (for referral scope, etc.). */
export function getInvoiceAuthUser(): Record<string, unknown> | null {
  const parsed = readStoredAuth();
  if (!parsed) return null;
  const nested = parsed.data ?? parsed.user;
  if (nested && typeof nested === "object") {
    return nested as Record<string, unknown>;
  }
  return parsed as Record<string, unknown>;
}

/** Email of the logged-in Invoice user (for BookWise proxy routes). */
export function getInvoiceUserEmail(): string {
  const parsed = readStoredAuth();
  if (!parsed) return "";

  const email =
    parsed?.email || parsed?.data?.email || parsed?.user?.email || "";

  return String(email).trim().toLowerCase();
}
