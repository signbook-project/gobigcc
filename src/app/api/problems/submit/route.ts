import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  problemId: z.string(),
  proposal: z.string().min(10),
  notes: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { problemId, proposal, notes, videoUrl } = parsed.data;

  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: { corporate: true },
  });
  if (!problem || problem.status !== "ACCEPTING_SOLUTIONS")
    return NextResponse.json({ error: "Challenge is not accepting solutions" }, { status: 400 });

  const existing = await prisma.problemSubmission.findFirst({
    where: { problemId, designerId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already submitted" }, { status: 409 });

  const submission = await prisma.problemSubmission.create({
    data: {
      problemId, proposal, notes,
      videoUrl: videoUrl || null,
      designerId: session.user.id,
      status: "SUBMITTED",
    },
  });

  // Boost creative score
  await prisma.designerProfile.updateMany({
    where: { userId: session.user.id },
    data: { creativeScore: { increment: 5 } },
  });

  // Notify the company that posted the challenge — corporate.userId is the actual User id
  const designer = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { designerProfile: true },
  });
  const designerName = designer?.designerProfile?.alias ?? designer?.name ?? "A designer";
  await createNotification({
    userId: problem.corporate.userId,
    type: "PROBLEM_UPDATE",
    title: `New submission for "${problem.title}"`,
    body: designerName,
    linkUrl: `/problems/${problem.slug}`,
  });

  return NextResponse.json({ success: true, submission }, { status: 201 });
}
