import { auth } from "@/lib/auth";
import { notifyNewComment } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1).max(2000),
  targetType: z.enum(["DESIGN", "PROBLEM", "JOB", "EDITORIAL"]),
  designId: z.string().optional(),
  problemId: z.string().optional(),
  jobId: z.string().optional(),
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

  const commenterName = comment.author.designerProfile?.alias ?? comment.author.name ?? "Someone";

  // Notify the relevant owner — skip self-comments in every case
  switch (parsed.data.targetType) {
    case "DESIGN": {
      if (!parsed.data.designId) break;
      const design = await prisma.design.findUnique({
        where: { id: parsed.data.designId },
        select: { title: true, slug: true, authorId: true },
      });
      if (design && design.authorId !== session.user.id) {
        await notifyNewComment(design.authorId, commenterName, design.title, `/designs/${design.slug}`, "design");
      }
      break;
    }
    case "PROBLEM": {
      if (!parsed.data.problemId) break;
      const problem = await prisma.problem.findUnique({
        where: { id: parsed.data.problemId },
        select: { title: true, slug: true, corporate: { select: { userId: true } } },
      });
      if (problem && problem.corporate.userId !== session.user.id) {
        await notifyNewComment(problem.corporate.userId, commenterName, problem.title, `/problems/${problem.slug}`, "challenge");
      }
      break;
    }
    case "JOB": {
      if (!parsed.data.jobId) break;
      const job = await prisma.job.findUnique({
        where: { id: parsed.data.jobId },
        select: { title: true, slug: true, postedById: true },
      });
      if (job && job.postedById !== session.user.id) {
        await notifyNewComment(job.postedById, commenterName, job.title, `/jobs/${job.slug}`, "job");
      }
      break;
    }
    case "EDITORIAL": {
      if (!parsed.data.articleId) break;
      const article = await prisma.editorialArticle.findUnique({
        where: { id: parsed.data.articleId },
        select: { title: true, slug: true, authorId: true },
      });
      if (article && article.authorId !== session.user.id) {
        await notifyNewComment(article.authorId, commenterName, article.title, `/editorial/${article.slug}`, "article");
      }
      break;
    }
  }

  return NextResponse.json({ success: true, comment }, { status: 201 });
}
