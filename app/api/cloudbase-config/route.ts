import { NextResponse } from "next/server";

// CloudBase Run supplies environment variables when the container starts.
// Serving the public client settings from a route prevents Docker build-time
// variable substitution from leaving the browser bundle unconfigured.
export const dynamic = "force-dynamic";

export function GET() {
  const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID;
  const accessKey = process.env.NEXT_PUBLIC_TCB_ACCESS_KEY;

  return NextResponse.json({
    envId: envId || null,
    accessKey: accessKey || null,
    region: process.env.NEXT_PUBLIC_TCB_REGION || "ap-shanghai",
  });
}
