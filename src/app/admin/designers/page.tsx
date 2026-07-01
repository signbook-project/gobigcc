import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import { AdminUserActions } from "@/components/admin/AdminUserActions";

const PER_PAGE = 20;
const STATUS_VARIANTS: Record<string, any> = {
  ACTIVE: "success", SUSPENDED: "warning", BANNED: "danger", PENDING_VERIFICATION: "info",
};

export default async function AdminDesignersPage({
  searchParams,
}: { searchParams: { q?: string; status?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);

  const where: any = { role: "DESIGNER" };
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) where.OR = [
    { name: { contains: searchParams.q, mode: "insensitive" } },
    { email: { contains: searchParams.q, mode: "insensitive" } },
    { designerProfile: { alias: { contains: searchParams.q, mode: "insensitive" } } },
  ];

  const [designers, total, avgScore] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: {
        designerProfile: true,
        _count: { select: { designs: true, problemSubmissions: true, jobApplications: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.designerProfile.aggregate({ _avg: { creativeScore: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Designers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} designer accounts · Avg. Creative Score: {Math.round(avgScore._avg.creativeScore ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input className="h-9 rounded-md border bg-background px-3 text-sm w-56" placeholder="Search name, email, alias…" defaultValue={searchParams.q} />
        {["", "ACTIVE", "SUSPENDED", "BANNED"].map(s => (
          <Link key={s} href={s ? `/admin/designers?status=${s}` : "/admin/designers"}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${(searchParams.status ?? "") === s ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
            {s || "All status"}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-xs text-muted-foreground">
              <th className="text-left px-4 py-3">Designer</th>
              <th className="text-left px-4 py-3">Creative Score</th>
              <th className="text-left px-4 py-3">Designs</th>
              <th className="text-left px-4 py-3">Submissions</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {designers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No designers found</td></tr>
            )}
            {designers.map(d => (
              <tr key={d.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/profile/${d.designerProfile?.alias ?? d.id}`} target="_blank" className="flex items-center gap-2.5 hover:underline">
                    <div className="h-7 w-7 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0">
                      {d.name?.[0]?.toUpperCase() ?? d.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{d.designerProfile?.alias ?? d.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{d.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{d.designerProfile?.creativeScore ?? 0}</td>
                <td className="px-4 py-3 text-muted-foreground">{d._count.designs}</td>
                <td className="px-4 py-3 text-muted-foreground">{d._count.problemSubmissions}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[d.status] ?? "secondary"}>{d.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(d.createdAt)}</td>
                <td className="px-4 py-3">
                  <AdminUserActions userId={d.id} currentStatus={d.status} currentRole={d.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / PER_PAGE) }, (_, i) => i + 1).slice(0, 10).map(p => (
            <Link key={p} href={`/admin/designers?page=${p}`}
              className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
