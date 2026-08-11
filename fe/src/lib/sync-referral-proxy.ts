import { NextRequest, NextResponse } from "next/server";
import { getSyncApiKey, getSyncBaseUrl } from "@/lib/sync-config";

const UPLOAD_TIMEOUT_MS = 120_000;
const JSON_TIMEOUT_MS = 30_000;

export function getReferralProxyAuth(
  request: NextRequest
): { headers: Record<string, string> } | NextResponse {
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

  const hostEmail = request.headers.get("x-invoice-user-email")?.trim().toLowerCase();
  if (!hostEmail) {
    return NextResponse.json(
      {
        success: false,
        message: "Invoice user email is required (x-invoice-user-email header).",
      },
      { status: 401 }
    );
  }

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

  return { headers };
}

/** Rebuild multipart body (same approach as Invoice profile_img uploads). */
export function rebuildMultipartBody(formData: FormData): FormData {
  const outbound = new FormData();

  for (const [key, value] of formData.entries()) {
    if (value instanceof Blob) {
      const fileName =
        value instanceof File && value.name ? value.name : "upload.bin";
      outbound.append(key, value, fileName);
      continue;
    }
    outbound.append(key, String(value));
  }

  return outbound;
}

/** Proxy JSON referral requests (GET/POST/PUT) to BookWise. */
export async function proxyReferralJson(
  request: NextRequest,
  iwPath: string,
  method: "GET" | "POST" | "PUT" = "GET"
): Promise<NextResponse> {
  const auth = getReferralProxyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const search = request.nextUrl.search;
  const url = `${getSyncBaseUrl()}/api/v1/${iwPath.replace(/^\//, "")}${search}`;

  const headers = { ...auth.headers };
  let body: string | undefined;
  if (method === "POST" || method === "PUT") {
    const text = await request.text();
    if (text) {
      body = text;
      headers["Content-Type"] =
        request.headers.get("content-type") || "application/json";
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JSON_TIMEOUT_MS);

    const upstream = await fetch(url, {
      method,
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
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

export type ShareSettingsImagePayload = {
  name: string;
  type: string;
  /** Base64 file bytes (no data: URL prefix). */
  data: string;
};

/**
 * Share-settings POST: browser sends JSON (incl. base64 images) to avoid CloudFront
 * blocking multipart on invoice.bookwise.io. Server rebuilds FormData → BookWise API.
 */
export async function proxyShareSettingsPost(
  request: NextRequest,
  iwPath: string
): Promise<NextResponse> {
  const auth = getReferralProxyAuth(request);
  if (auth instanceof NextResponse) return auth;

  let json: Record<string, unknown>;
  try {
    json = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const url = `${getSyncBaseUrl()}/api/v1/${iwPath.replace(/^\//, "")}`;
  const rawImages = json.images;
  const images = Array.isArray(rawImages)
    ? (rawImages as ShareSettingsImagePayload[]).filter((img) => img?.data)
    : [];

  const timeoutMs = images.length > 0 ? UPLOAD_TIMEOUT_MS : JSON_TIMEOUT_MS;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let upstream: Response;

    if (images.length > 0) {
      const formData = new FormData();
      if (json.share_title !== undefined) {
        formData.append("share_title", String(json.share_title));
      }
      if (json.share_body !== undefined) {
        formData.append("share_body", String(json.share_body));
      }
      if (json.remove_images) {
        formData.append("remove_images", "1");
      }
      const removeUrls = json.remove_image_urls;
      if (Array.isArray(removeUrls)) {
        for (const u of removeUrls) {
          formData.append("remove_image_urls[]", String(u));
        }
      }
      for (const img of images) {
        const mime = img.type || "image/png";
        const buf = Buffer.from(img.data, "base64");
        const blob = new Blob([buf], { type: mime });
        formData.append("images[]", blob, img.name || "share-image.png");
      }

      upstream = await fetch(url, {
        method: "POST",
        headers: auth.headers,
        body: formData,
        signal: controller.signal,
      });
    } else {
      upstream = await fetch(url, {
        method: "POST",
        headers: { ...auth.headers, "Content-Type": "application/json" },
        body: JSON.stringify(json),
        signal: controller.signal,
      });
    }

    clearTimeout(timeout);

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Image upload timed out. Please try a smaller image or retry."
        : "Could not reach BookWise referral service.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

export async function proxyReferralMultipart(
  request: NextRequest,
  iwPath: string
): Promise<NextResponse> {
  const auth = getReferralProxyAuth(request);
  if (auth instanceof NextResponse) return auth;

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid multipart form data." },
      { status: 400 }
    );
  }

  const body = rebuildMultipartBody(incoming);
  const url = `${getSyncBaseUrl()}/api/v1/${iwPath.replace(/^\//, "")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    const upstream = await fetch(url, {
      method: "POST",
      headers: auth.headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Image upload timed out. Please try a smaller image or retry."
        : "Could not reach BookWise referral service.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
