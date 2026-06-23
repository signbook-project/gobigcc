import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import { AdminReportActions } from "@/components/admin/AdminReportActions";

const STATUS_VARIANTS: Record<string, any> = {
  PENDING: "warning", REVIEWED: "info", RESOLVED: "success", DISMISSED: "secondary",
};
const TYPE_VARIANTS: Record<string, any> = {
  COPYRIGHT_VIOLATION: "danger", SPAM: "warning", ABUSE: "danger",
  DUPLICATE_CONTENT: "secondary", OTHER: "outline",
};

export default async function AdminReportsPage({
  searchParams,
}: { searchParams: { status?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);
  const PER_PAGE = 20;
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  else where.status = "PENDING"; // default to pending

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: {
        reporter: true,
        reportedDesign: { select: { title: true, slug: true } },
        reportedUser: { select: { name: true, email: true } },
        reportedComment: { select: { content: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} {searchParams.status ?? "pending"} reports</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5">
        {["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"].map(s => (
          <a key={s} href={`/admin/reports?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${(searchParams.status ?? "PENDING") === s ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
            {s}
          </a>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-xs text-muted-foreground">
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Target</th>
              <th className="text-left px-4 py-3">Reported by</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No reports found</td></tr>
            )}
            {reports.map(r => (
              <tr key={r.id} className="hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <Badge variant={TYPE_VARIANTS[r.reportType] ?? "secondary"} className="text-[10px]">
                    {r.reportType.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                  <span className="font-medium text-foreground block">{r.targetType}</span>
                  <span className="truncate block">
                    {r.reportedDesign?.title ?? r.reportedUser?.email ?? r.reportedComment?.content?.slice(0, 40) ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.reporter.email}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                  <span className="line-clamp-2">{r.description ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[r.status] ?? "secondary"}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <AdminReportActions reportId={r.id} currentStatus={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
