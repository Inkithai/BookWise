/**
 * bookwise-sync.service.ts
 *
 * Fire-and-forget sync service for the BookWise main backend.
 *
 * Every create / update / delete on Users, Roles, and Permissions that
 * succeeds inside the Invoice app is mirrored to the BookWise API
 * using the shared api-key + email header authentication that was enabled
 * on that backend.
 *
 * These calls are intentionally non-blocking:  if the sync fails the
 * primary operation has already succeeded, so we only log the error and
 * swallow it.
 */

import axios from "axios";
import https from "https";

// ---------------------------------------------------------------------------
// HTTP client – targets the BookWise main backend (port 8000)
// ---------------------------------------------------------------------------
const iwHttp = axios.create({
    baseURL: `${(
        process.env.NEXT_PUBLIC_BOOKWISE_API_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "").replace(/\/api\/?$/, "")}/api/v1/`,
    timeout: 15_000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

/**
 * Build the auth headers for every BookWise request.
 * api-key  → the shared APP_API_KEY from the BookWise .env
 * email    → the email of the currently logged-in invoice user
 *             (passed explicitly so the server can authenticate the caller)
 */
function buildHeaders(callerEmail: string): Record<string, string> {
    const apiKey =
        process.env.BOOKWISE_APP_API_KEY || // server-side Next.js
        process.env.NEXT_PUBLIC_BOOKWISE_APP_API_KEY || // client-side fallback
        "";

    return {
        "api-key": apiKey,
        email: callerEmail,
        Accept: "application/json",
        "Content-Type": "application/json",
    };
}

/**
 * Resolve the currently authenticated user's email from localStorage.
 * Falls back to an empty string – the middleware will reject the request,
 * which will be caught and swallowed by the caller.
 */
function getCallerEmail(): string {
    if (typeof window === "undefined") return "";
    try {
        const userKey =
            process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "authUser";
        const raw = localStorage.getItem(userKey);
        if (!raw) return "";
        const parsed = JSON.parse(raw);
        return parsed?.email || parsed?.data?.email || "";
    } catch {
        return "";
    }
}

// ---------------------------------------------------------------------------
// Helper – fire-and-forget wrapper
// ---------------------------------------------------------------------------
async function syncSafe(
    label: string,
    fn: () => Promise<unknown>
): Promise<void> {
    try {
        await fn();
        console.log(`✅ [BookWise Sync] ${label} — mirrored to BookWise`);
    } catch (err) {
        // Never surface sync errors to the UI – the primary action already succeeded.
        console.warn(`⚠️ [BookWise Sync] ${label} — sync failed (non-blocking):`, err);
    }
}

// ---------------------------------------------------------------------------
// REGISTRATION (host signup mirrored from Invoice)
// ---------------------------------------------------------------------------

export interface IWRegisterUserPayload {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    username: string;
    password: string;
    password_confirmation: string;
    registration_source?: "invoice";
    /** Optional — validated via validateReferralCode before register */
    referral_code?: string;
}

export type ReferralValidationResult =
    | { ok: true; code: string }
    | { ok: false; message: string };

const REFERRAL_STORAGE_KEY = "invoiceReferralCode";

export function getStoredInvoiceReferralCode(): string {
    if (typeof window === "undefined") return "";
    return (sessionStorage.getItem(REFERRAL_STORAGE_KEY) || "").trim().toUpperCase();
}

export function setStoredInvoiceReferralCode(code: string): void {
    if (typeof window === "undefined") return;
    const normalized = code.trim().toUpperCase();
    if (normalized) {
        sessionStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
    } else {
        sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
    }
}

export function clearStoredInvoiceReferralCode(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
}

/** Validate referral code on BookWise (public auth endpoint via proxy). */
export async function validateReferralCode(
    code: string
): Promise<ReferralValidationResult> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
        return { ok: false, message: "Referral code is required." };
    }

    const res = await fetch("/api/sync/validate-referral", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ referral_code: normalized }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || (data as { success?: boolean })?.success === false) {
        return {
            ok: false,
            message: extractErrorMessage(
                data,
                "The referral code you entered is invalid. Please check and try again."
            ),
        };
    }

    const validCode =
        (data as { data?: { code?: string } })?.data?.code || normalized;

    return { ok: true, code: validCode.toUpperCase() };
}

/** Pre-check email/phone on BookWise API before registration (via Next.js proxy). */
export async function validateRegistration(
    email: string,
    phone_number: string
) {
    const res = await fetch("/api/sync/validate-registration", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ email, phone_number }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err: Error & { response?: { status: number; data: unknown } } =
            new Error(
                (data as { message?: string })?.message ||
                    "BookWise validation failed."
            );
        err.response = { status: res.status, data };
        throw err;
    }

    return { data, status: res.status };
}

function extractErrorMessage(data: unknown, fallback: string): string {
    if (!data || typeof data !== "object") return fallback;
    const d = data as {
        message?: string;
        errors?: Record<string, string | string[]>;
    };
    if (d.message) return d.message;
    if (d.errors) {
        const first = Object.values(d.errors).flat()[0];
        if (first) return String(first);
    }
    return fallback;
}

/**
 * Register the user on BookWise (api-key via server route) before Invoice signup.
 * Throws on failure so the UI can block orphaned Invoice-only accounts.
 */
export async function registerBookWiseUser(
    payload: IWRegisterUserPayload
): Promise<void> {
    const res = await fetch("/api/sync/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            ...payload,
            registration_source: "invoice",
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || (data as { success?: boolean })?.success === false) {
        const errData = data as { errors?: Record<string, string | string[]> };
        const normalizedErrors: Record<string, string[]> = {};
        if (errData?.errors) {
            for (const [key, value] of Object.entries(errData.errors)) {
                normalizedErrors[key] = Array.isArray(value)
                    ? value.map(String)
                    : [String(value)];
            }
        }

        const { detectExistingAccountField } = await import(
            "@/lib/bookwise-existing-account"
        );

        const err = new Error(
            extractErrorMessage(
                data,
                "Could not create your BookWise account. Check your details and try again."
            )
        ) as Error & {
            fieldErrors?: Record<string, string>;
            existingAccount?: import("@/lib/bookwise-existing-account").ExistingAccountField;
        };

        if (errData?.errors?.referral_code) {
            const msgs = errData.errors.referral_code;
            err.fieldErrors = {
                referral_code: Array.isArray(msgs) ? String(msgs[0]) : String(msgs),
            };
        }

        const existingAccount = detectExistingAccountField(normalizedErrors);
        if (existingAccount) {
            err.existingAccount = existingAccount;
        }

        throw err;
    }
}

/**
 * After Invoice OTP succeeds, enable BookWise login (no platform email OTP).
 */
export async function activateAfterOtp(
    email: string
): Promise<void> {
    const res = await fetch("/api/sync/activate-after-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || (data as { success?: boolean })?.success === false) {
        throw new Error(
            extractErrorMessage(
                data,
                "Invoice verified, but BookWise activation failed. Try logging in again later or contact support."
            )
        );
    }
}

/** Stable BookWise username from email (login on platform still uses email + password). */
export function buildUsernameFromEmail(email: string): string {
    const local = email.split("@")[0] || "user";
    const base = local.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 40);
    const suffix = Date.now().toString(36).slice(-4);
    return `${base || "user"}_${suffix}`;
}

// ---------------------------------------------------------------------------
// USER SYNC
// ---------------------------------------------------------------------------

export interface IWSyncUserPayload {
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
    user_name?: string;
    active?: number;
    roles?: number | number[];
    role_name?: string;
    password?: string;
    password_confirmation?: string;
}

async function fetchRolesList(
    callerEmail: string
): Promise<{ id: number; name: string }[]> {
    const res = await fetch(
        `/api/sync/roles?host_email=${encodeURIComponent(callerEmail)}`,
        { method: "GET", headers: { Accept: "application/json" } }
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(
            extractErrorMessage(
                data,
                `Could not load roles from BookWise (${res.status}).`
            )
        );
    }

    return (data as { data?: { id: number; name: string }[] })?.data ?? [];
}

async function resolveRoleId(
    roleName: string,
    callerEmail: string
): Promise<number> {
    const normalized = roleName.toLowerCase();
    const pick = (list: { id: number; name: string }[]) =>
        list.find((r) => String(r.name).toLowerCase() === normalized);

    let match = pick(await fetchRolesList(callerEmail));
    if (match?.id) {
        return match.id;
    }

    const ensureRes = await fetch("/api/sync/roles", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            host_email: callerEmail,
            role_name: roleName,
        }),
    });

    const ensured = await ensureRes.json().catch(() => ({}));
    const ensuredId = (ensured as { data?: { id?: number } })?.data?.id;

    if (ensuredId) {
        return ensuredId;
    }

    // Role may already exist but was missing from the first list (super-admin scope).
    match = pick(await fetchRolesList(callerEmail));
    if (match?.id) {
        return match.id;
    }

    throw new Error(
        extractErrorMessage(
            ensured,
            `Could not resolve role "${roleName}" on BookWise.`
        )
    );
}

/** Validate email / username / phone on BookWise (via Next.js proxy). */
export async function validateUserFields(payload: {
    email: string;
    user_name: string;
    phone_number?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string; errors?: Record<string, string[]> }> {
    const res = await fetch("/api/sync/validate-user", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            email: payload.email,
            user_name: payload.user_name.trim().toLowerCase().replace(/\s+/g, "-"),
            phone_number: payload.phone_number || null,
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || (data as { success?: boolean })?.success === false) {
        return {
            ok: false,
            message: extractErrorMessage(
                data,
                "This email, username, or phone is already used on BookWise."
            ),
            errors: (data as { errors?: Record<string, string[]> })?.errors,
        };
    }

    return { ok: true };
}

/**
 * Create sub-user on BookWise (must succeed for dual-system create).
 */
export async function syncCreateUser(
    payload: IWSyncUserPayload
): Promise<void> {
    const callerEmail = getCallerEmail();
    if (!callerEmail) {
        throw new Error("You must be logged in to sync users to BookWise.");
    }

    const username = (payload.user_name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    let roleId = typeof payload.roles === "number" ? payload.roles : undefined;
    if (payload.role_name) {
        roleId = await resolveRoleId(payload.role_name, callerEmail);
    }

    if (!roleId) {
        throw new Error("A valid role is required to create the user on BookWise.");
    }

    const res = await fetch("/api/sync/sync-sub-user", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            host_email: callerEmail,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            phone_number: payload.phone_number ?? null,
            username,
            roles: roleId,
            active: payload.active ?? 1,
            // Invoice flow sends the invite email; suppress duplicate platform email.
            send_invite_email: false,
            send_email: false,
            skip_email: true,
            // BookWise user should be immediately usable without separate verification.
            is_active: 1,
            is_otp_verified: 1,
            auto_verify: true,
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || (data as { success?: boolean })?.success === false) {
        throw new Error(
            extractErrorMessage(
                data,
                "Could not create user on BookWise."
            )
        );
    }
}

/**
 * Hard-sync password to BookWise (used after Invoice reset-password).
 * This is a blocking call: caller should decide how to handle failure.
 */
export async function syncPasswordByEmail(payload: {
    email: string;
    password: string;
}): Promise<void> {
    const res = await fetch("/api/sync/sync-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            email: payload.email,
            password: payload.password,
        }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data as { success?: boolean })?.success === false) {
        throw new Error(
            extractErrorMessage(
                data,
                "Password updated on Invoice but could not sync to BookWise."
            )
        );
    }
}

/**
 * Mirror a user update to BookWise.
 * Uses POST with _method=PUT because BookWise may also accept
 * multipart-safe PUT override (same pattern as the invoice backend).
 */
export async function syncUpdateUser(
    id: number,
    payload: Partial<IWSyncUserPayload>
): Promise<void> {
    const email = getCallerEmail();
    await syncSafe(`updateUser(${id})`, () =>
        iwHttp.post(`admin/users/${id}`, { _method: "PUT", ...payload }, { headers: buildHeaders(email) })
    );
}

/**
 * Mirror a user deletion to BookWise.
 */
export async function syncDeleteUser(id: number): Promise<void> {
    const email = getCallerEmail();
    await syncSafe(`deleteUser(${id})`, () =>
        iwHttp.delete(`admin/users/${id}`, { headers: buildHeaders(email) })
    );
}

// ---------------------------------------------------------------------------
// ROLE SYNC
// ---------------------------------------------------------------------------

export interface IWSyncRolePayload {
    name: string;
    guard_name?: string;
}

/**
 * Mirror a newly created role to BookWise.
 */
export async function syncCreateRole(
    payload: IWSyncRolePayload
): Promise<void> {
    const email = getCallerEmail();
    await syncSafe("createRole", () =>
        iwHttp.post("admin/roles", payload, { headers: buildHeaders(email) })
    );
}

/**
 * Mirror a role name/guard update to BookWise.
 */
export async function syncUpdateRole(
    id: number,
    payload: Partial<IWSyncRolePayload>
): Promise<void> {
    const email = getCallerEmail();
    await syncSafe(`updateRole(${id})`, () =>
        iwHttp.put(`admin/roles/${id}`, payload, { headers: buildHeaders(email) })
    );
}

/**
 * Mirror a role deletion to BookWise.
 */
export async function syncDeleteRole(id: number): Promise<void> {
    const email = getCallerEmail();
    await syncSafe(`deleteRole(${id})`, () =>
        iwHttp.delete(`admin/roles/${id}`, { headers: buildHeaders(email) })
    );
}

// ---------------------------------------------------------------------------
// PERMISSIONS SYNC
// ---------------------------------------------------------------------------

/**
 * Mirror an updated permission set for a role to BookWise.
 * The BookWise backend endpoint is POST /api/v1/admin/roles/{id}/permissions.
 */
export async function syncAssignPermissions(
    roleId: number,
    permissions: string[]
): Promise<void> {
    const email = getCallerEmail();
    await syncSafe(`assignPermissions(role=${roleId})`, () =>
        iwHttp.post(
            `admin/roles/${roleId}/permissions`,
            { permissions },
            { headers: buildHeaders(email) }
        )
    );
}
