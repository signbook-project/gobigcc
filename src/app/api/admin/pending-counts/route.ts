import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [pendingJobs, pendingReports] = await Promise.all([
    prisma.job.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({ success: true, pendingJobs, pendingReports });
}
