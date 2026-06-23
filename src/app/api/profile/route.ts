import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { designerProfile: true, corporateProfile: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    profile: user.designerProfile ?? user.corporateProfile,
  });
}

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  alias: z.string().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/, "Alias can only contain letters, numbers, _ and -").optional(),
  bio: z.string().max(500).optional(),
  country: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  experience: z.string().optional(),
  skills: z.array(z.string()).optional(),
  socialLinks: z.record(z.string()).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { name, alias, ...profileData } = parsed.data;

  // Check alias uniqueness
  if (alias) {
    const existing = await prisma.designerProfile.findFirst({
      where: { alias, userId: { not: session.user.id } },
    });
    if (existing) return NextResponse.json({ error: "Alias already taken" }, { status: 409 });
  }

  const [user] = await prisma.$transaction([
    ...(name ? [prisma.user.update({ where: { id: session.user.id }, data: { name } })] : []),
    prisma.designerProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, alias, ...profileData },
      update: { alias, ...profileData },
    }),
  ] as any[]);

  return NextResponse.json({ success: true });
}
