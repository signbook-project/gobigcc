import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Card";
import { timeAgo, formatCurrency } from "@/lib/utils";
import { AdminProblemActions } from "@/components/admin/AdminProblemActions";

const PER_PAGE = 20;
const STATUS_VARIANTS: Record<string, any> = {
  DRAFT: "secondary", PUBLISHED: "info", ACCEPTING_SOLUTIONS: "success",
  REVIEWING: "warning", WINNER_SELECTED: "info", CLOSED: "outline",
};

export default async function AdminProblemsPage({
  searchParams,
}: { searchParams: { status?: string; q?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) where.title = { contains: searchParams.q, mode: "insensitive" };

  const [problems, total, statusCounts] = await Promise.all([
    prisma.problem.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { corporate: true, _count: { select: { submissions: true, reports: true } } },
    }),
    prisma.problem.count({ where }),
    prisma.problem.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const countMap = new Map(statusCounts.map(s => [s.status, s._count.id]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Challenges</h1>
        <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString()} challenges total</p>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/problems"
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${!searchParams.status ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
          All ({total})
        </Link>
        {["ACCEPTING_SOLUTIONS", "REVIEWING", "WINNER_SELECTED", "CLOSED", "DRAFT"].map(s => (
          <Link key={s} href={`/admin/problems?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${searchParams.status === s ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
            {s.replace(/_/g, " ")} ({countMap.get(s as any) ?? 0})
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-xs text-muted-foreground">
              <th className="text-left px-4 py-3">Challenge</th>
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Reward</th>
              <th className="text-left px-4 py-3">Submissions</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Posted</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {problems.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No challenges found</td></tr>
            )}
            {problems.map(p => (
              <tr key={p.id} className={`hover:bg-secondary/50 transition-colors ${p._count.reports > 0 ? "bg-red-50/30" : ""}`}>
                <td className="px-4 py-3 max-w-[220px]">
                  <Link href={`/problems/${p.slug}`} target="_blank" className="font-medium hover:underline truncate block">
                    {p.title}
                  </Link>
                  {p._count.reports > 0 && <Badge variant="danger" className="mt-1 text-[10px]">{p._count.reports} reports</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.corporate.companyName}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.rewardType === "CASH" && p.rewardAmount ? formatCurrency(p.rewardAmount) : p.rewardType.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p._count.submissions}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"}>{p.status.replace(/_/g, " ")}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <AdminProblemActions problemId={p.id} currentStatus={p.status} slug={p.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / PER_PAGE) }, (_, i) => i + 1).slice(0, 10).map(p => (
            <Link key={p} href={`/admin/problems?page=${p}`}
              className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
