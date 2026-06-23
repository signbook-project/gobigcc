import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = 20;
  const q = searchParams.get("q");
  const role = searchParams.get("role");
  const status = searchParams.get("status");

  const where: any = {};
  if (q) where.OR = [
    { email: { contains: q, mode: "insensitive" } },
    { name: { contains: q, mode: "insensitive" } },
  ];
  if (role) where.role = role;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        designerProfile: true,
        corporateProfile: true,
        _count: { select: { designs: true, jobApplications: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, status, role } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const update: any = {};
  if (status) update.status = status;
  if (role) update.role = role;

  const user = await prisma.user.update({ where: { id: userId }, data: update });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "user.update",
      targetType: "User",
      targetId: userId,
      metadata: update,
    },
  });

  return NextResponse.json({ success: true, user });
}
