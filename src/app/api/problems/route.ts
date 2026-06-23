import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uniqueSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("perPage") ?? 12);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const sort = searchParams.get("sort") ?? "newest";

  const where: any = { status: { in: ["ACCEPTING_SOLUTIONS","REVIEWING","WINNER_SELECTED"] } };
  if (category) where.category = category;
  if (status) where.status = status;
  if (q) where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { description: { contains: q, mode: "insensitive" } },
  ];

  const orderBy: any =
    sort === "prize" ? { rewardAmount: "desc" }
    : sort === "deadline" ? { deadline: "asc" }
    : { createdAt: "desc" };

  const [data, total] = await Promise.all([
    prisma.problem.findMany({
      where, orderBy,
      skip: (page - 1) * perPage, take: perPage,
      include: { corporate: { include: { user: true } }, _count: { select: { submissions: true } } },
    }),
    prisma.problem.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) });
}

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  background: z.string().optional(),
  deliverables: z.string().optional(),
  constraints: z.string().optional(),
  category: z.string(),
  rewardType: z.string(),
  rewardAmount: z.number().optional(),
  rewardDetails: z.string().optional(),
  deadline: z.string().optional(),
  submissionVisibility: z.enum(["PUBLIC","PRIVATE"]).default("PUBLIC"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.corporateProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Only corporate accounts can post challenges" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const d = parsed.data;
    const problem = await prisma.problem.create({
      data: {
        title: d.title,
        slug: uniqueSlug(d.title),
        description: d.description,
        background: d.background,
        deliverables: d.deliverables,
        constraints: d.constraints,
        category: d.category as any,
        rewardType: d.rewardType as any,
        rewardAmount: d.rewardAmount,
        rewardDetails: d.rewardDetails,
        deadline: d.deadline ? new Date(d.deadline) : null,
        submissionVisibility: d.submissionVisibility as any,
        status: "ACCEPTING_SOLUTIONS",
        publishedAt: new Date(),
        corporateId: profile.id,
      },
    });
    return NextResponse.json({ success: true, problem }, { status: 201 });
  } catch (err) {
    console.error("[problems/create]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
