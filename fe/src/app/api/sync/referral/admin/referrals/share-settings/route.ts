import { NextRequest } from "next/server";
import { proxyReferralJson, proxyShareSettingsPost } from "@/lib/sync-referral-proxy";

export const runtime = "nodejs";
export const maxDuration = 120;

const IW_PATH = "admin/referrals/share-settings";

/** Load share settings (title, body, images). */
export async function GET(request: NextRequest) {
  return proxyReferralJson(request, IW_PATH, "GET");
}

/** Save share settings (JSON + base64 images → server builds multipart for sync backend). */
export async function POST(request: NextRequest) {
  return proxyShareSettingsPost(request, IW_PATH);
}
