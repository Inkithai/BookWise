import { NextRequest, NextResponse } from "next/server";
import { syncUpstreamFetch } from "@/lib/sync-proxy";

/** Proxy: create sub-user on BookWise under the Invoice host account. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const hostEmail = String(body.host_email || "").trim();
  if (!hostEmail) {
    return NextResponse.json(
      {
        success: false,
        message: "Host email is required to create a user on BookWise.",
      },
      { status: 422 }
    );
  }

  try {
    const upstream = await syncUpstreamFetch("/api/v1/auth/invoice-sync/sub-users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach BookWise.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
