import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uniqueSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = 15;
  const type = searchParams.get("type");
  const remote = searchParams.get("remote");
  const q = searchParams.get("q");

  const where: any = { status: "ACTIVE" };
  if (type) where.employmentType = type;
  if (remote === "1") where.isRemote = true;
  if (q) where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { description: { contains: q, mode: "insensitive" } },
  ];

  const [data, total] = await Promise.all([
    prisma.job.findMany({
      where, orderBy: { publishedAt: "desc" },
      skip: (page - 1) * perPage, take: perPage,
      include: { corporate: { include: { user: true } }, _count: { select: { applications: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) });
}

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20),
  employmentType: z.string(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  salaryCurrency: z.string().default("INR"),
  experience: z.string().optional(),
  skills: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.corporateProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Only corporate accounts can post jobs" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const d = parsed.data;
  const job = await prisma.job.create({
    data: {
      ...d,
      slug: uniqueSlug(d.title),
      employmentType: d.employmentType as any,
      status: "ACTIVE",
      publishedAt: new Date(),
      corporateId: profile.id,
    },
  });

  return NextResponse.json({ success: true, job }, { status: 201 });
}
