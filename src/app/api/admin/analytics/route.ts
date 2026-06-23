import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();

  // Build last 30 days array
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Users per day (last 30 days)
  const usersByDay = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
    FROM "User"
    WHERE "createdAt" >= ${days30[0]}
    GROUP BY day ORDER BY day ASC
  `;

  // Designs per day
  const designsByDay = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "publishedAt") as day, COUNT(*) as count
    FROM "Design"
    WHERE "publishedAt" >= ${days30[0]} AND "visibility" = 'PUBLIC'
    GROUP BY day ORDER BY day ASC
  `;

  // Messages per day
  const messagesByDay = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
    FROM "Message"
    WHERE "createdAt" >= ${days30[0]}
    GROUP BY day ORDER BY day ASC
  `;

  // Helper: map raw query results onto the 30-day array
  function mapToSeries(raw: { day: Date; count: bigint }[]) {
    const lookup = new Map(raw.map(r => [r.day.toISOString().slice(0, 10), Number(r.count)]));
    return days30.map(d => ({
      date: d.toISOString().slice(0, 10),
      count: lookup.get(d.toISOString().slice(0, 10)) ?? 0,
    }));
  }

  // Category breakdown
  const designsByCategory = await prisma.design.groupBy({
    by: ["category"],
    where: { visibility: "PUBLIC" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  // License breakdown
  const designsByLicense = await prisma.design.groupBy({
    by: ["licenseType"],
    where: { visibility: "PUBLIC" },
    _count: { id: true },
  });

  // User role breakdown
  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });

  // Problem status breakdown
  const problemsByStatus = await prisma.problem.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // Job type breakdown
  const jobsByType = await prisma.job.groupBy({
    by: ["employmentType"],
    where: { status: "ACTIVE" },
    _count: { id: true },
  });

  // Top designers by creative score
  const topDesigners = await prisma.designerProfile.findMany({
    orderBy: { creativeScore: "desc" },
    take: 10,
    include: { user: { select: { name: true, email: true } } },
  });

  // Top designs by likes
  const topDesigns = await prisma.design.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { likeCount: "desc" },
    take: 10,
    select: { id: true, title: true, slug: true, likeCount: true, viewCount: true, forkCount: true, category: true },
  });

  // Summary totals
  const [
    totalUsers, totalDesigns, totalProblems,
    totalJobs, totalComments, totalMessages,
    totalReports, totalSubmissions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.design.count({ where: { visibility: "PUBLIC" } }),
    prisma.problem.count(),
    prisma.job.count({ where: { status: "ACTIVE" } }),
    prisma.comment.count(),
    prisma.message.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.problemSubmission.count(),
  ]);

  // Week-over-week growth
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400_000);
  const [usersThisWeek, usersLastWeek, designsThisWeek, designsLastWeek] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.design.count({ where: { publishedAt: { gte: weekAgo }, visibility: "PUBLIC" } }),
    prisma.design.count({ where: { publishedAt: { gte: twoWeeksAgo, lt: weekAgo }, visibility: "PUBLIC" } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalUsers, totalDesigns, totalProblems,
        totalJobs, totalComments, totalMessages,
        totalReports, totalSubmissions,
      },
      growth: {
        usersThisWeek, usersLastWeek,
        designsThisWeek, designsLastWeek,
        userGrowthPct: usersLastWeek > 0 ? Math.round(((usersThisWeek - usersLastWeek) / usersLastWeek) * 100) : 100,
        designGrowthPct: designsLastWeek > 0 ? Math.round(((designsThisWeek - designsLastWeek) / designsLastWeek) * 100) : 100,
      },
      series: {
        users: mapToSeries(usersByDay),
        designs: mapToSeries(designsByDay),
        messages: mapToSeries(messagesByDay),
        labels: days30.map(d => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })),
      },
      breakdowns: {
        designsByCategory: designsByCategory.map(d => ({ name: d.category.replace(/_/g, " "), value: d._count.id })),
        designsByLicense: designsByLicense.map(d => ({ name: d.licenseType.replace(/_/g, " "), value: d._count.id })),
        usersByRole: usersByRole.map(d => ({ name: d.role, value: d._count.id })),
        problemsByStatus: problemsByStatus.map(d => ({ name: d.status.replace(/_/g, " "), value: d._count.id })),
        jobsByType: jobsByType.map(d => ({ name: d.employmentType.replace(/_/g, " "), value: d._count.id })),
      },
      leaderboards: { topDesigners, topDesigns },
    },
  });
}
