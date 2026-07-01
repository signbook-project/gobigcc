import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/designs
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("perPage") ?? 24);
  const category = searchParams.get("category");
  const license = searchParams.get("license");
  const sort = searchParams.get("sort") ?? "trending";
  const q = searchParams.get("q");

  const where: any = { visibility: "PUBLIC" };
  if (category) where.category = category;
  if (license) where.licenseType = license;
  if (q) where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { tags: { has: q } },
  ];

  const orderBy: any =
    sort === "newest" ? { createdAt: "desc" }
    : sort === "most_forked" ? { forkCount: "desc" }
    : sort === "most_liked" ? { likeCount: "desc" }
    : { likeCount: "desc" };

  const [data, total] = await Promise.all([
    prisma.design.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        author: { include: { designerProfile: true } },
        files: { take: 1, orderBy: { sortOrder: "asc" } },
        _count: { select: { likes: true, saves: true, comments: true } },
      },
    }),
    prisma.design.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) });
}

const baseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().optional().default(""),
  designNotes: z.string().optional(),
  category: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(["PUBLIC", "UNLISTED", "DRAFT"]).default("DRAFT"),
  identityType: z.enum(["REAL_NAME", "ALIAS"]).default("REAL_NAME"),
  publishedAlias: z.string().optional(),
  licenseType: z.enum(["OPEN_SOURCE", "ROYALTY_BASED", "COLLABORATION_ONLY", "CUSTOM"]).default("OPEN_SOURCE"),
  licenseDetails: z.record(z.any()).optional(),
  figmaLink: z.string().url().optional().or(z.literal("")),
});

const createSchema = baseSchema.superRefine((data, ctx) => {
  // Drafts can be incomplete — skip strict checks
  if (data.visibility === "DRAFT") return;

  if (!data.description || data.description.trim().length < 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Description must be at least 20 characters to publish",
      path: ["description"],
    });
  }
  if (!data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Category is required to publish",
      path: ["category"],
    });
  }
  if (data.identityType === "ALIAS" && (!data.publishedAlias || !data.publishedAlias.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Alias name is required when publishing under an alias",
      path: ["publishedAlias"],
    });
  }
});

// POST /api/designs
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const data = parsed.data;
    const slug = uniqueSlug(data.title);

    const design = await prisma.design.create({
      data: {
        ...data,
        slug,
        category: (data.category || "OTHER") as any,
        licenseType: data.licenseType as any,
        authorId: session.user.id,
        publishedAt: data.visibility === "PUBLIC" ? new Date() : null,
      },
    });

    // Boost creative score on publish
    if (data.visibility === "PUBLIC") {
      await prisma.designerProfile.updateMany({
        where: { userId: session.user.id },
        data: { creativeScore: { increment: 10 } },
      });
    }

    return NextResponse.json({ success: true, design }, { status: 201 });
  } catch (err) {
    console.error("[designs/create]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
