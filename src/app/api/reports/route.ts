import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  targetType: z.enum(["DESIGN", "COMMENT", "USER", "PROBLEM", "JOB"]),
  reportType: z.enum(["COPYRIGHT_VIOLATION", "SPAM", "ABUSE", "DUPLICATE_CONTENT", "OTHER"]),
  description: z.string().optional(),
  reportedDesignId: z.string().optional(),
  reportedCommentId: z.string().optional(),
  reportedUserId: z.string().optional(),
  reportedProblemId: z.string().optional(),
  reportedJobId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const report = await prisma.report.create({
    data: { ...parsed.data, reporterId: session.user.id, status: "PENDING" },
  });

  return NextResponse.json({ success: true, report }, { status: 201 });
}
