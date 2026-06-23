import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = 20;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const q = searchParams.get("q");

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (q) where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { excerpt: { contains: q, mode: "insensitive" } },
  ];

  const [data, total] = await Promise.all([
    prisma.editorialArticle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { author: { select: { name: true, email: true } } },
    }),
    prisma.editorialArticle.count({ where }),
  ]);

  return NextResponse.json({ success: true, data, total, page, perPage, totalPages: Math.ceil(total / perPage) });
}

const createSchema = z.object({
  title: z.string().min(5).max(300),
  type: z.enum(["ARTICLE", "INTERVIEW", "TREND_REPORT", "FEATURED_PROJECT", "NEWSLETTER"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10),
  tags: z.array(z.string()).default([]),
  readTimeMin: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const d = parsed.data;
  const article = await prisma.editorialArticle.create({
    data: {
      ...d,
      slug: uniqueSlug(d.title),
      authorId: session.user.id,
      publishedAt: d.status === "PUBLISHED" ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: { actorId: session.user.id, action: "editorial.create", targetType: "EditorialArticle", targetId: article.id },
  });

  return NextResponse.json({ success: true, article }, { status: 201 });
}
