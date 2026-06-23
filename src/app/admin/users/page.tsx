import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { AdminUserActions } from "@/components/admin/AdminUserActions";

const PER_PAGE = 20;

const STATUS_VARIANTS: Record<string, any> = {
  ACTIVE: "success", SUSPENDED: "warning", BANNED: "danger", PENDING_VERIFICATION: "info",
};
const ROLE_VARIANTS: Record<string, any> = {
  ADMIN: "danger", DESIGNER: "secondary", CORPORATE: "info", VISITOR: "outline",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; status?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const where: any = {};
  if (searchParams.q) where.OR = [
    { email: { contains: searchParams.q, mode: "insensitive" } },
    { name: { contains: searchParams.q, mode: "insensitive" } },
  ];
  if (searchParams.role) where.role = searchParams.role;
  if (searchParams.status) where.status = searchParams.status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: {
        designerProfile: true, corporateProfile: true,
        _count: { select: { designs: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input className="h-9 rounded-md border bg-background px-3 text-sm w-56" placeholder="Search email or name…" defaultValue={searchParams.q} />
        {["", "ADMIN", "DESIGNER", "CORPORATE", "VISITOR"].map(r => (
          <Link key={r} href={r ? `/admin/users?role=${r}` : "/admin/users"}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${(searchParams.role ?? "") === r ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
            {r || "All roles"}
          </Link>
        ))}
        {["", "ACTIVE", "SUSPENDED", "BANNED"].map(s => (
          <Link key={s} href={s ? `/admin/users?status=${s}` : "/admin/users"}
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
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Designs</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0">
                      {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge variant={ROLE_VARIANTS[u.role] ?? "secondary"}>{u.role}</Badge></td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[u.status] ?? "secondary"}>{u.status}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{u._count.designs}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{timeAgo(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <AdminUserActions userId={u.id} currentStatus={u.status} currentRole={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / PER_PAGE) }, (_, i) => i + 1).slice(0, 10).map(p => (
            <Link key={p} href={`/admin/users?page=${p}`}
              className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
