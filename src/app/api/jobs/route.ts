import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = 15;
  const type = searchParams.get("type");
  const remote = searchParams.get("remote");
  const q = searchParams.get("q");

  // Public listing only ever shows approved, live jobs
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
      include: {
        corporate: { include: { user: true } },
        postedBy: { include: { designerProfile: true, corporateProfile: true } },
        _count: { select: { applications: true } },
      },
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
  // Used when the poster has no CorporateProfile (designer/visitor posting on a company's behalf)
  companyNameOverride: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

// POST /api/jobs — open to ANY signed-in user. Always lands as PENDING_REVIEW.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const d = parsed.data;

  // If the poster already has a CorporateProfile, attach it automatically.
  const corporateProfile = await prisma.corporateProfile.findUnique({ where: { userId: session.user.id } });

  // Require a company name somehow — either from their profile or from the override field
  const companyName = corporateProfile?.companyName ?? d.companyNameOverride;
  if (!companyName || !companyName.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      title: d.title,
      description: d.description,
      employmentType: d.employmentType as any,
      location: d.location,
      isRemote: d.isRemote,
      salaryMin: d.salaryMin,
      salaryMax: d.salaryMax,
      salaryCurrency: d.salaryCurrency,
      experience: d.experience,
      skills: d.skills,
      slug: uniqueSlug(d.title),
      status: "PENDING_REVIEW",
      postedById: session.user.id,
      corporateId: corporateProfile?.id ?? null,
      companyNameOverride: corporateProfile ? null : companyName,
      contactEmail: d.contactEmail || session.user.email,
    },
  });

  // Notify all admins that a new job is awaiting review
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map(a =>
      createNotification({
        userId: a.id,
        type: "SYSTEM",
        title: "New job posting awaiting review",
        body: `"${d.title}" by ${companyName}`,
        linkUrl: `/admin/jobs?status=PENDING_REVIEW`,
      })
    )
  );

  return NextResponse.json({ success: true, job }, { status: 201 });
}
