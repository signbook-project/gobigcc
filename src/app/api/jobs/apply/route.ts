import { auth } from "@/lib/auth";
import { sendJobApplicationStatusEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  jobId: z.string(),
  portfolioUrl: z.string().optional(),
  coverNote: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { jobId, portfolioUrl, coverNote } = parsed.data;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, postedById: true, contactEmail: true, companyNameOverride: true, status: true },
  });
  if (!job || job.status !== "ACTIVE")
    return NextResponse.json({ error: "This job is not currently accepting applications" }, { status: 400 });

  const existing = await prisma.jobApplication.findFirst({
    where: { jobId, applicantId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  const application = await prisma.jobApplication.create({
    data: { jobId, applicantId: session.user.id, portfolioUrl, coverNote, status: "APPLIED" },
  });

  // Forward the response to whoever originally posted the job —
  // this is the core of "system forwards responses to the poster."
  await createNotification({
    userId: job.postedById,
    type: "JOB_MATCH",
    title: `New application for "${job.title}"`,
    body: session.user.name ?? session.user.email,
    linkUrl: `/jobs/applications/${jobId}`,
  });

  // Also email the contact address on file (works even if the poster rarely logs in)
  if (job.contactEmail) {
    sendJobApplicationStatusEmail(
      job.contactEmail,
      session.user.name ?? session.user.email,
      job.title,
      "New application received"
    ).catch(err => console.error("[jobs/apply] email forward failed:", err));
  }

  return NextResponse.json({ success: true, application }, { status: 201 });
}
