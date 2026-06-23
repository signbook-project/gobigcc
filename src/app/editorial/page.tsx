import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import { BookOpen, Mic, TrendingUp, Star, Mail } from "lucide-react";

const TYPES = [
  { value: "", label: "All" },
  { value: "ARTICLE", label: "Articles" },
  { value: "INTERVIEW", label: "Interviews" },
  { value: "TREND_REPORT", label: "Trends" },
  { value: "FEATURED_PROJECT", label: "Featured projects" },
  { value: "NEWSLETTER", label: "Newsletters" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  ARTICLE: BookOpen, INTERVIEW: Mic, TREND_REPORT: TrendingUp,
  FEATURED_PROJECT: Star, NEWSLETTER: Mail,
};
const TYPE_LABELS: Record<string, string> = {
  ARTICLE: "Article", INTERVIEW: "Interview", TREND_REPORT: "Trend report",
  FEATURED_PROJECT: "Featured project", NEWSLETTER: "Newsletter",
};
const TYPE_VARIANTS: Record<string, any> = {
  ARTICLE: "secondary", INTERVIEW: "info", TREND_REPORT: "success",
  FEATURED_PROJECT: "warning", NEWSLETTER: "outline",
};

const PER_PAGE = 12;

export default async function EditorialPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const where: any = { status: "PUBLISHED" };
  if (searchParams.type) where.type = searchParams.type;

  const [articles, total] = await Promise.all([
    prisma.editorialArticle.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { author: true },
    }),
    prisma.editorialArticle.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Editorial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trend reports, interviews, and featured projects from the design world.
          </p>
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 flex-wrap mb-8">
          {TYPES.map((t) => (
            <Link
              key={t.value}
              href={t.value ? `/editorial?type=${t.value}` : "/editorial"}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                (searchParams.type ?? "") === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {articles.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">No articles yet</div>
        ) : (
          <>
            {/* Featured article */}
            {featured && !searchParams.type && (
              <Link href={`/editorial/${featured.slug}`} className="block mb-8 group">
                <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[3/1] bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                    {(() => { const Icon = TYPE_ICONS[featured.type] ?? BookOpen; return <Icon className="h-12 w-12 text-muted-foreground/40" />; })()}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={TYPE_VARIANTS[featured.type] ?? "secondary"}>
                        {TYPE_LABELS[featured.type] ?? featured.type}
                      </Badge>
                      {featured.readTimeMin && (
                        <span className="text-xs text-muted-foreground">{featured.readTimeMin} min read</span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold group-hover:underline line-clamp-2">{featured.title}</h2>
                    {featured.excerpt && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{featured.excerpt}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                      By {featured.author.name ?? "GoBig Editorial"} · {featured.publishedAt ? timeAgo(featured.publishedAt) : ""}
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Article grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(searchParams.type ? articles : rest).map((article) => {
                const Icon = TYPE_ICONS[article.type] ?? BookOpen;
                return (
                  <Link key={article.id} href={`/editorial/${article.slug}`} className="group flex flex-col rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="aspect-video bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <Icon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={TYPE_VARIANTS[article.type] ?? "secondary"} className="text-[10px] px-1.5 py-0">
                          {TYPE_LABELS[article.type] ?? article.type}
                        </Badge>
                        {article.readTimeMin && (
                          <span className="text-xs text-muted-foreground">{article.readTimeMin} min</span>
                        )}
                      </div>
                      <h3 className="font-medium text-sm leading-snug group-hover:underline line-clamp-2">{article.title}</h3>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{article.excerpt}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-auto">
                        {article.author.name ?? "GoBig Editorial"} · {article.publishedAt ? timeAgo(article.publishedAt) : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/editorial?page=${p}`}
                    className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${
                      p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
