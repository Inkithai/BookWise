import { NextRequest, NextResponse } from "next/server";
import { syncUpstreamFetch } from "@/lib/sync-proxy";

/** Proxy: sync password to BookWise for invoice reset flow. */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: "Email and password are required." },
      { status: 422 }
    );
  }

  try {
    const upstream = await syncUpstreamFetch("/api/v1/auth/invoice-sync/password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach BookWise.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
