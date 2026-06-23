import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  content: z.string().min(1).max(2000),
  targetType: z.enum(["DESIGN", "PROBLEM", "JOB", "EDITORIAL"]),
  designId: z.string().optional(),
  problemId: z.string().optional(),
  articleId: z.string().optional(),
  parentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const comment = await prisma.comment.create({
    data: {
      ...parsed.data,
      authorId: session.user.id,
    },
    include: {
      author: { include: { designerProfile: true } },
      replies: { include: { author: { include: { designerProfile: true } } } },
    },
  });

  return NextResponse.json({ success: true, comment }, { status: 201 });
}
