import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { safeNext } from "@/lib/auth/redirect";
import { DEMO_STAFF_ALLOWED, DEMO_STAFF_COOKIE } from "@/lib/staff/session";
import { isRole } from "@/lib/staff/roles";

async function processDemoLogin(scenarioParam: string | null, nextParam: string | null, originUrl: string, isJson: boolean) {
  // Staff console demo (local and preview builds only): built-in demo cases, never the database, never writes.
  if (scenarioParam === "staff" && DEMO_STAFF_ALLOWED) {
    const role = new URL(originUrl).searchParams.get("role") ?? "admin";
    (await cookies()).set(DEMO_STAFF_COOKIE, isRole(role) ? role : "admin", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8 });
    const target = nextParam?.startsWith("/staff") ? safeNext(nextParam) : "/staff/overview";
    return isJson ? NextResponse.json({ success: true, redirect: target }) : NextResponse.redirect(new URL(target, originUrl), { status: 303 });
  }

  const scenarioKey = (scenarioParam && scenarioParam in DEMO_CONFIGS ? scenarioParam : "ready") as DemoScenario;
  const config = DEMO_CONFIGS[scenarioKey];

  const next = safeNext(nextParam);

  const cookieStore = await cookies();

  // Set demo session cookies
  cookieStore.set("ez_demo_session", JSON.stringify({
    email: config.email,
    name: config.name,
    scenario: config.id,
    logged_at: new Date().toISOString(),
  }), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  cookieStore.set("ez_demo_active", "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  if (isJson) {
    return NextResponse.json({
      success: true,
      redirect: next,
      user: {
        email: config.email,
        name: config.name,
        scenario: config.id,
      },
    });
  }

  return NextResponse.redirect(new URL(next, originUrl), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let scenario: string | null = null;
  let next: string | null = null;

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      scenario = body.scenario || null;
      next = body.next || null;
      return processDemoLogin(scenario, next, request.url, true);
    } catch {
      // Fall through to query params
    }
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      scenario = (formData.get("scenario") as string) || null;
      next = (formData.get("next") as string) || null;
      return processDemoLogin(scenario, next, request.url, false);
    } catch {
      // Fall through
    }
  }

  const { searchParams } = new URL(request.url);
  scenario = searchParams.get("scenario");
  next = searchParams.get("next");
  return processDemoLogin(scenario, next, request.url, false);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get("scenario");
  const next = searchParams.get("next");
  return processDemoLogin(scenario, next, request.url, false);
}
