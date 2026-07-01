import { Badge, StatCard } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { formatCurrency, timeAgo } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Dashboard — Admin" };

async function getDashboardData() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers, newUsersWeek,
    totalDesigns, newDesignsWeek,
    pendingReports,
    pendingJobs,
    revenueMonth,
    recentReports,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.design.count({ where: { visibility: "PUBLIC" } }),
    prisma.design.count({ where: { publishedAt: { gte: weekAgo } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.job.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.report.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { reporter: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { designerProfile: true, corporateProfile: true },
    }),
  ]);

  return {
    totalUsers, newUsersWeek,
    totalDesigns, newDesignsWeek,
    pendingReports,
    pendingJobs,
    revenueMonth: revenueMonth._sum.amount ?? 0,
    recentReports,
    recentUsers,
  };
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  COPYRIGHT_VIOLATION: "Copyright",
  SPAM: "Spam",
  ABUSE: "Abuse",
  DUPLICATE_CONTENT: "Duplicate",
  OTHER: "Other",
};

const STATUS_VARIANT: Record<string, any> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  BANNED: "danger",
  PENDING_VERIFICATION: "info",
};

export default async function AdminDashboard() {
  const d = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={d.totalUsers.toLocaleString()} delta={`+${d.newUsersWeek} this week`} />
        <StatCard label="Designs published" value={d.totalDesigns.toLocaleString()} delta={`+${d.newDesignsWeek} this week`} />
        <StatCard label="Pending reports" value={d.pendingReports} delta={d.pendingReports > 0 ? "Needs review" : "All clear"} />
        <StatCard label="Pending jobs" value={d.pendingJobs} delta={d.pendingJobs > 0 ? "Awaiting approval" : "All clear"} />
        <StatCard label="Revenue MTD" value={formatCurrency(d.revenueMonth)} delta="+18% vs last month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports queue */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-medium text-sm">Moderation queue</h2>
            <Link href="/admin/reports" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y">
            {d.recentReports.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No pending reports</p>
            )}
            {d.recentReports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Badge variant="warning" className="shrink-0">{REPORT_TYPE_LABELS[r.reportType] ?? r.reportType}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{r.targetType} report</p>
                  <p className="text-xs text-muted-foreground">by {r.reporter.email} · {timeAgo(r.createdAt)}</p>
                </div>
                <Link href={`/admin/reports/${r.id}`} className="text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-medium text-sm">Recent signups</h2>
            <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y">
            {d.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name ?? u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.role} · {timeAgo(u.createdAt)}</p>
                </div>
                <Badge variant={STATUS_VARIANT[u.status] ?? "secondary"}>{u.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
