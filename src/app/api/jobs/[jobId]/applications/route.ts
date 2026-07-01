import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyJobApplicationStatus } from "@/lib/notifications";

// GET /api/jobs/[jobId]/applications — only the original poster (or an admin) can view
export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await prisma.job.findUnique({
    where: { id: params.jobId },
    select: { id: true, title: true, postedById: true, status: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isOwner = job.postedById === session.user.id;
  const isAdmin = (session.user as any).role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const applications = await prisma.jobApplication.findMany({
    where: { jobId: params.jobId },
    orderBy: { createdAt: "desc" },
    include: {
      applicant: { include: { designerProfile: true } },
    },
  });

  return NextResponse.json({ success: true, job, applications });
}

// PATCH /api/jobs/[jobId]/applications — poster updates an applicant's status
export async function PATCH(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId, status } = await req.json();
  if (!applicationId || !status) return NextResponse.json({ error: "applicationId and status required" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { id: params.jobId }, select: { postedById: true, title: true } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isOwner = job.postedById === session.user.id;
  const isAdmin = (session.user as any).role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const application = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  // Notify the applicant their status changed
  await notifyJobApplicationStatus(application.applicantId, job.title, status);

  return NextResponse.json({ success: true, application });
}
