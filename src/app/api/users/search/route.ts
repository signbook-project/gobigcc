import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/users/search?q=... — used to find people to start a new conversation with
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ success: true, users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      status: "ACTIVE",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { designerProfile: { alias: { contains: q, mode: "insensitive" } } },
        { corporateProfile: { companyName: { contains: q, mode: "insensitive" } } },
      ],
    },
    take: 10,
    include: { designerProfile: true, corporateProfile: true },
  });

  return NextResponse.json({
    success: true,
    users: users.map(u => ({
      id: u.id,
      name: u.corporateProfile?.companyName ?? u.designerProfile?.alias ?? u.name ?? u.email,
      role: u.role,
      designerProfile: u.designerProfile ? { alias: u.designerProfile.alias } : null,
    })),
  });
}
