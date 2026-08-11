import { NextRequest, NextResponse } from "next/server";
import { syncUpstreamFetch } from "@/lib/sync-proxy";

/** Proxy: list BookWise roles for Invoice sub-user create (role name → id). */
export async function GET(request: NextRequest) {
  const hostEmail =
    request.nextUrl.searchParams.get("host_email")?.trim() ||
    request.headers.get("x-sync-host-email")?.trim() ||
    "";

  if (!hostEmail) {
    return NextResponse.json(
      {
        success: false,
        message: "Host email is required to load BookWise roles.",
      },
      { status: 422 }
    );
  }

  try {
    const upstream = await syncUpstreamFetch(
      `/api/v1/auth/invoice-sync/roles?host_email=${encodeURIComponent(hostEmail)}`
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach BookWise.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

/** Proxy: find or create BookWise role (empty permissions) for Invoice role name. */
export async function POST(request: NextRequest) {
  let body: { host_email?: string; role_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const hostEmail = String(body.host_email || "").trim();
  const roleName = String(body.role_name || "").trim();

  if (!hostEmail || !roleName) {
    return NextResponse.json(
      {
        success: false,
        message: "Host email and role name are required.",
      },
      { status: 422 }
    );
  }

  try {
    const upstream = await syncUpstreamFetch("/api/v1/auth/invoice-sync/roles", {
      method: "POST",
      body: JSON.stringify({ host_email: hostEmail, role_name: roleName }),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach BookWise.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
