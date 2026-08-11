import { NextRequest, NextResponse } from "next/server";
import { getSyncApiKey, getSyncBaseUrl } from "@/lib/sync-config";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyToIw(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const apiKey = getSyncApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "BookWise API key is not configured. Set BOOKWISE_APP_API_KEY or NEXT_PUBLIC_BOOKWISE_APP_API_KEY.",
      },
      { status: 500 }
    );
  }

  const hostEmail = request.headers
    .get("x-invoice-user-email")
    ?.trim()
    .toLowerCase();

  if (!hostEmail) {
    return NextResponse.json(
      {
        success: false,
        message: "Invoice user email is required (x-invoice-user-email header).",
      },
      { status: 401 }
    );
  }

  const search = request.nextUrl.search;
  const iwPath = `${getSyncBaseUrl()}/api/v1/${pathSegments.join("/")}${search}`;

  const referralScope = request.headers
    .get("x-invoice-referral-scope")
    ?.trim()
    .toLowerCase();

  const headers: Record<string, string> = {
    "api-key": apiKey,
    email: hostEmail,
    Accept: "application/json",
  };

  if (referralScope === "own" || referralScope === "team") {
    headers["x-referral-scope"] = referralScope;
  }

  let body: BodyInit | undefined;
  const contentType = request.headers.get("content-type") || "";

  if (request.method !== "GET" && request.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      const incoming = await request.formData();
      const outbound = new FormData();
      for (const [key, value] of incoming.entries()) {
        if (value instanceof Blob) {
          const fileName =
            value instanceof File && value.name ? value.name : "upload.bin";
          outbound.append(key, value, fileName);
        } else {
          outbound.append(key, String(value));
        }
      }
      body = outbound;
    } else {
      const text = await request.text();
      if (text) {
        body = text;
        headers["Content-Type"] = contentType || "application/json";
      }
    }
  }

  try {
    const controller = new AbortController();
    const timeoutMs = contentType.includes("multipart/form-data") ? 120000 : 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const upstream = await fetch(iwPath, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Referral request timed out while contacting BookWise."
        : "Could not reach BookWise referral service.";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToIw(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToIw(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToIw(request, path);
}
