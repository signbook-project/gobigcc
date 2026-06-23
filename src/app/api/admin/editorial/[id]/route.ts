import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(5).max(300).optional(),
  type: z.enum(["ARTICLE", "INTERVIEW", "TREND_REPORT", "FEATURED_PROJECT", "NEWSLETTER"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10).optional(),
  tags: z.array(z.string()).optional(),
  readTimeMin: z.number().int().positive().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const article = await prisma.editorialArticle.findUnique({
    where: { id: params.id },
    include: { author: { select: { name: true, email: true } } },
  });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, article });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const existing = await prisma.editorialArticle.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const publishedAt =
    parsed.data.status === "PUBLISHED" && existing.status !== "PUBLISHED"
      ? new Date()
      : existing.publishedAt;

  const article = await prisma.editorialArticle.update({
    where: { id: params.id },
    data: { ...parsed.data, publishedAt },
  });

  await prisma.auditLog.create({
    data: { actorId: session.user.id, action: "editorial.update", targetType: "EditorialArticle", targetId: params.id, metadata: parsed.data },
  });

  return NextResponse.json({ success: true, article });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.editorialArticle.update({ where: { id: params.id }, data: { status: "ARCHIVED" } });

  await prisma.auditLog.create({
    data: { actorId: session.user.id, action: "editorial.archive", targetType: "EditorialArticle", targetId: params.id },
  });

  return NextResponse.json({ success: true });
}
