import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/settings — upsert settings for a section
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { section, settings } = await req.json();
    if (!section || !settings) {
      return NextResponse.json({ error: "section and settings required" }, { status: 400 });
    }

    const SECRET_KEYS = ["smtp_pass", "database_url", "database_url_unpooled", "service_role_key", "razorpay_secret"];

    const ops = Object.entries(settings).map(([key, value]) =>
      prisma.platformSetting.upsert({
        where: { section_key: { section, key } },
        create: {
          section,
          key,
          value: String(value),
          isSecret: SECRET_KEYS.includes(key),
          updatedBy: session.user.id,
        },
        update: {
          value: String(value),
          updatedBy: session.user.id,
        },
      })
    );

    await prisma.$transaction(ops);

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "settings.update",
        targetType: "PlatformSetting",
        metadata: { section, keys: Object.keys(settings) },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/settings]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/admin/settings?section=email — fetch settings for a section (secrets masked)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const section = new URL(req.url).searchParams.get("section");
  const where = section ? { section } : {};

  const settings = await prisma.platformSetting.findMany({ where });

  const masked = settings.map((s) => ({
    ...s,
    value: s.isSecret ? "••••••••" : s.value,
  }));

  return NextResponse.json({ success: true, data: masked });
}
