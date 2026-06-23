import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reportId, status, adminNote } = await req.json();
  if (!reportId || !status) return NextResponse.json({ error: "reportId and status required" }, { status: 400 });

  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status, adminNote, reviewedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "report.update",
      targetType: "Report",
      targetId: reportId,
      metadata: { status },
    },
  });

  return NextResponse.json({ success: true, report });
}
