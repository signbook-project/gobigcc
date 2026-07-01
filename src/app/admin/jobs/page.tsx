import { AdminJobActions } from "@/components/admin/AdminJobActions";
import { Badge } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";

const PER_PAGE = 20;
const STATUS_VARIANTS: Record<string, any> = {
  DRAFT: "secondary", PENDING_REVIEW: "warning", ACTIVE: "success",
  REJECTED: "danger", PAUSED: "warning", CLOSED: "outline",
};
const TYPE_VARIANTS: Record<string, any> = {
  FULL_TIME: "success", PART_TIME: "info", FREELANCE: "warning", INTERNSHIP: "secondary", CONTRACT: "outline",
};

export default async function AdminJobsPage({
  searchParams,
}: { searchParams: { status?: string; q?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);
  // Default view: show pending review first so admins never miss new submissions
  const status = searchParams.status ?? "PENDING_REVIEW";
  const where: any = {};
  if (status !== "ALL") where.status = status;
  if (searchParams.q) where.title = { contains: searchParams.q, mode: "insensitive" };

  const [jobs, total, statusCounts] = await Promise.all([
    prisma.job.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: {
        corporate: true,
        postedBy: { select: { name: true, email: true } },
        _count: { select: { applications: true, reports: true } },
      },
    }),
    prisma.job.count({ where }),
    prisma.job.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const countMap = new Map(statusCounts.map(s => [s.status, s._count.id]));
  const totalAll = statusCounts.reduce((sum, s) => sum + s._count.id, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Jobs</h1>
        <p className="text-sm text-muted-foreground mt-1">{totalAll.toLocaleString()} job listings total</p>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/jobs?status=ALL"
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${status === "ALL" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
          All ({totalAll})
        </Link>
        {["PENDING_REVIEW", "ACTIVE", "PAUSED", "REJECTED", "CLOSED"].map(s => (
          <Link key={s} href={`/admin/jobs?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${status === s ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"} ${s === "PENDING_REVIEW" && (countMap.get(s as any) ?? 0) > 0 ? "font-medium" : ""}`}>
            {s.replace(/_/g, " ")} ({countMap.get(s as any) ?? 0})
          </Link>
        ))}
      </div>

      {status === "PENDING_REVIEW" && jobs.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {jobs.length} job{jobs.length > 1 ? "s" : ""} waiting for your review before going live.
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-xs text-muted-foreground">
              <th className="text-left px-4 py-3">Job</th>
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Posted by</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Applications</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Submitted</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                {status === "PENDING_REVIEW" ? "No jobs waiting for review 🎉" : "No jobs found"}
              </td></tr>
            )}
            {jobs.map(j => (
              <tr key={j.id} className={`hover:bg-secondary/50 transition-colors ${j._count.reports > 0 ? "bg-red-50/30" : ""}`}>
                <td className="px-4 py-3 max-w-[200px]">
                  <Link href={`/jobs/${j.slug}`} target="_blank" className="font-medium hover:underline truncate block">
                    {j.title}
                  </Link>
                  {j._count.reports > 0 && <Badge variant="danger" className="mt-1 text-[10px]">{j._count.reports} reports</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {j.corporate?.companyName ?? j.companyNameOverride ?? "—"}
                  {!j.corporate && <Badge variant="outline" className="ml-1.5 text-[9px] px-1">non-corporate</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {j.postedBy.name ?? j.postedBy.email}
                </td>
                <td className="px-4 py-3"><Badge variant={TYPE_VARIANTS[j.employmentType] ?? "secondary"} className="text-[10px]">{j.employmentType.replace(/_/g, " ")}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{j._count.applications}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[j.status] ?? "secondary"}>{j.status.replace(/_/g, " ")}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(j.createdAt)}</td>
                <td className="px-4 py-3">
                  <AdminJobActions jobId={j.id} currentStatus={j.status} slug={j.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / PER_PAGE) }, (_, i) => i + 1).slice(0, 10).map(p => (
            <Link key={p} href={`/admin/jobs?status=${status}&page=${p}`}
              className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
