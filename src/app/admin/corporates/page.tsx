import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { AdminVerifyToggle } from "@/components/admin/AdminVerifyToggle";

const PER_PAGE = 20;
const STATUS_VARIANTS: Record<string, any> = {
  ACTIVE: "success", SUSPENDED: "warning", BANNED: "danger", PENDING_VERIFICATION: "info",
};

export default async function AdminCorporatesPage({
  searchParams,
}: { searchParams: { q?: string; status?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);

  const where: any = { role: "CORPORATE" };
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) where.OR = [
    { name: { contains: searchParams.q, mode: "insensitive" } },
    { email: { contains: searchParams.q, mode: "insensitive" } },
    { corporateProfile: { companyName: { contains: searchParams.q, mode: "insensitive" } } },
  ];

  const [corporates, total, verifiedCount] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { corporateProfile: true },
    }),
    prisma.user.count({ where }),
    prisma.corporateProfile.count({ where: { verified: true } }),
  ]);

  // Fetch problem/job counts per corporate profile (separate query, keyed by corporateProfile.id)
  const profileIds = corporates.map(c => c.corporateProfile?.id).filter(Boolean) as string[];
  const [problemCounts, jobCounts] = await Promise.all([
    profileIds.length
      ? prisma.problem.groupBy({ by: ["corporateId"], where: { corporateId: { in: profileIds } }, _count: { id: true } })
      : Promise.resolve([]),
    profileIds.length
      ? prisma.job.groupBy({ by: ["corporateId"], where: { corporateId: { in: profileIds } }, _count: { id: true } })
      : Promise.resolve([]),
  ]);
  const problemMap = new Map(problemCounts.map(p => [p.corporateId, p._count.id]));
  const jobMap = new Map(jobCounts.map(j => [j.corporateId, j._count.id]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} company accounts · {verifiedCount} verified
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input className="h-9 rounded-md border bg-background px-3 text-sm w-56" placeholder="Search company, email…" defaultValue={searchParams.q} />
        {["", "ACTIVE", "SUSPENDED", "BANNED"].map(s => (
          <Link key={s} href={s ? `/admin/corporates?status=${s}` : "/admin/corporates"}
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
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Industry</th>
              <th className="text-left px-4 py-3">Challenges</th>
              <th className="text-left px-4 py-3">Jobs</th>
              <th className="text-left px-4 py-3">Verified</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {corporates.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No companies found</td></tr>
            )}
            {corporates.map(c => (
              <tr key={c.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-md bg-secondary border flex items-center justify-center text-xs font-semibold shrink-0">
                      {c.corporateProfile?.companyName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium">{c.corporateProfile?.companyName ?? c.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.corporateProfile?.industry ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{problemMap.get(c.corporateProfile?.id ?? "") ?? 0}</td>
                <td className="px-4 py-3 text-muted-foreground">{jobMap.get(c.corporateProfile?.id ?? "") ?? 0}</td>
                <td className="px-4 py-3">
                  {c.corporateProfile && (
                    <AdminVerifyToggle corporateId={c.corporateProfile.id} verified={c.corporateProfile.verified} />
                  )}
                </td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[c.status] ?? "secondary"}>{c.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <AdminUserActions userId={c.id} currentStatus={c.status} currentRole={c.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / PER_PAGE) }, (_, i) => i + 1).slice(0, 10).map(p => (
            <Link key={p} href={`/admin/corporates?page=${p}`}
              className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
