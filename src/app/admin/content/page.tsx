import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";

const PER_PAGE = 20;

export default async function AdminContentPage({
  searchParams,
}: { searchParams: { page?: string; category?: string } }) {
  const page = Number(searchParams.page ?? 1);
  const where: any = { visibility: "PUBLIC" };
  if (searchParams.category) where.category = searchParams.category;

  const [designs, total] = await Promise.all([
    prisma.design.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: {
        author: { include: { designerProfile: true } },
        _count: { select: { likes: true, reports: true } },
      },
    }),
    prisma.design.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Designs</h1>
        <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString()} published designs</p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-xs text-muted-foreground">
              <th className="text-left px-4 py-3">Design</th>
              <th className="text-left px-4 py-3">Author</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">License</th>
              <th className="text-left px-4 py-3">Likes</th>
              <th className="text-left px-4 py-3">Reports</th>
              <th className="text-left px-4 py-3">Published</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {designs.map(d => (
              <tr key={d.id} className={`hover:bg-secondary/50 transition-colors ${d._count.reports > 0 ? "bg-red-50/30" : ""}`}>
                <td className="px-4 py-3 max-w-[200px]">
                  <Link href={`/designs/${d.slug}`} target="_blank" className="font-medium hover:underline truncate block">
                    {d.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {d.author.designerProfile?.alias ?? d.author.name ?? d.author.email}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{d.category.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-[10px]">{d.licenseType.replace(/_/g, " ")}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{d._count.likes}</td>
                <td className="px-4 py-3">
                  {d._count.reports > 0
                    ? <Badge variant="danger">{d._count.reports} reports</Badge>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{d.publishedAt ? timeAgo(d.publishedAt) : "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/designs/${d.slug}`} target="_blank"
                    className="rounded border px-2 py-1 text-xs hover:bg-secondary transition-colors">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
