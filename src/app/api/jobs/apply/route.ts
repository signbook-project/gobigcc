import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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

  const existing = await prisma.jobApplication.findFirst({
    where: { jobId, applicantId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  const application = await prisma.jobApplication.create({
    data: { jobId, applicantId: session.user.id, portfolioUrl, coverNote, status: "APPLIED" },
  });

  return NextResponse.json({ success: true, application }, { status: 201 });
}
