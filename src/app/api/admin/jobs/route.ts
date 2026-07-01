import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { jobId, status, rejectionReason } = await req.json();
  if (!jobId || !status) return NextResponse.json({ error: "jobId and status required" }, { status: 400 });

  const existing = await prisma.job.findUnique({ where: { id: jobId } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const data: any = {
    status,
    reviewedById: session.user.id,
    reviewedAt: new Date(),
  };

  if (status === "ACTIVE" && !existing.publishedAt) {
    data.publishedAt = new Date();
  }
  if (status === "REJECTED") {
    data.rejectionReason = rejectionReason ?? null;
  }

  const job = await prisma.job.update({ where: { id: jobId }, data });

  // Notify the original poster of the decision
  if (status === "ACTIVE") {
    await createNotification({
      userId: existing.postedById,
      type: "SYSTEM",
      title: "Your job posting is now live",
      body: existing.title,
      linkUrl: `/jobs/${job.slug}`,
    });
  } else if (status === "REJECTED") {
    await createNotification({
      userId: existing.postedById,
      type: "SYSTEM",
      title: "Your job posting was not approved",
      body: rejectionReason ? `Reason: ${rejectionReason}` : existing.title,
      linkUrl: `/jobs`,
    });
  } else if (status === "PAUSED") {
    await createNotification({
      userId: existing.postedById,
      type: "SYSTEM",
      title: "Your job posting was paused",
      body: existing.title,
    });
  }

  await prisma.auditLog.create({
    data: { actorId: session.user.id, action: "job.update", targetType: "Job", targetId: jobId, metadata: { status, rejectionReason } },
  });

  return NextResponse.json({ success: true, job });
}
