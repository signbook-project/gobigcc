import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import { Plus } from "lucide-react";
import { AdminArticleActions } from "@/components/admin/AdminArticleActions";

const STATUS_VARIANTS: Record<string, any> = {
  DRAFT: "secondary", PUBLISHED: "success", ARCHIVED: "outline",
};
const TYPE_VARIANTS: Record<string, any> = {
  ARTICLE: "secondary", INTERVIEW: "info", TREND_REPORT: "success",
  FEATURED_PROJECT: "warning", NEWSLETTER: "outline",
};

const PER_PAGE = 20;

export default async function AdminEditorialPage({
  searchParams,
}: { searchParams: { status?: string; type?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.type = searchParams.type;

  const [articles, total] = await Promise.all([
    prisma.editorialArticle.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { author: { select: { name: true, email: true } } },
    }),
    prisma.editorialArticle.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Editorial</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} articles total</p>
        </div>
        <Link href="/admin/editorial/new"
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New article
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[["", "All status"], ["DRAFT", "Draft"], ["PUBLISHED", "Published"], ["ARCHIVED", "Archived"]].map(([v, l]) => (
          <Link key={v} href={v ? `/admin/editorial?status=${v}` : "/admin/editorial"}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${(searchParams.status ?? "") === v ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
            {l}
          </Link>
        ))}
        <div className="w-px bg-border mx-1" />
        {[["", "All types"], ["ARTICLE", "Article"], ["INTERVIEW", "Interview"], ["TREND_REPORT", "Trend report"], ["FEATURED_PROJECT", "Featured"], ["NEWSLETTER", "Newsletter"]].map(([v, l]) => (
          <Link key={v} href={v ? `/admin/editorial?type=${v}` : "/admin/editorial"}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${(searchParams.type ?? "") === v ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
            {l}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-xs text-muted-foreground">
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Author</th>
              <th className="text-left px-4 py-3">Read time</th>
              <th className="text-left px-4 py-3">Published</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {articles.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                No articles yet. <Link href="/admin/editorial/new" className="underline">Create your first one →</Link>
              </td></tr>
            )}
            {articles.map(a => (
              <tr key={a.id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-4 py-3 max-w-[260px]">
                  <p className="font-medium truncate">{a.title}</p>
                  {a.excerpt && <p className="text-xs text-muted-foreground truncate mt-0.5">{a.excerpt}</p>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={TYPE_VARIANTS[a.type] ?? "secondary"} className="text-[10px]">
                    {a.type.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[a.status] ?? "secondary"}>{a.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.author.name ?? a.author.email}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.readTimeMin ? `${a.readTimeMin} min` : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {a.publishedAt ? timeAgo(a.publishedAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <AdminArticleActions articleId={a.id} currentStatus={a.status} slug={a.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / PER_PAGE) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/admin/editorial?page=${p}`}
              className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
