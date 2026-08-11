import { NextRequest, NextResponse } from "next/server";
import { getSyncBaseUrl } from "@/lib/sync-config";

/** Proxy: validate email / username / phone on BookWise before sub-user create. */
export async function POST(request: NextRequest) {
  let body: { email?: string; user_name?: string; username?: string; phone_number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const username = (body.username || body.user_name || "").trim();
  if (!body.email || !username) {
    return NextResponse.json(
      {
        success: false,
        message: "Email and username are required.",
        errors: {
          ...(!body.email ? { email: ["Email is required."] } : {}),
          ...(!username ? { user_name: ["Username is required."] } : {}),
        },
      },
      { status: 422 }
    );
  }

  const base = getSyncBaseUrl();

  try {
    const upstream = await fetch(`${base}/api/v1/auth/validate-user-fields`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        username,
        phone_number: body.phone_number || null,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: `Could not reach BookWise at ${base}. Is it running on port 8000?`,
      },
      { status: 502 }
    );
  }
}
