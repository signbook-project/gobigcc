import { Navbar } from "@/components/layout/Navbar";
import { CommentSection } from "@/components/shared/CommentSection";
import { ShareButton } from "@/components/shared/ShareButton";
import { Badge } from "@/components/ui/Card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import { BookOpen, ChevronLeft, Mail, Mic, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function EditorialArticlePage({ params }: { params: { slug: string } }) {
  const session = await auth();

  const article = await prisma.editorialArticle.findUnique({
    where: { slug: params.slug, status: "PUBLISHED" },
    include: { author: true },
  });
  if (!article) notFound();

  // Related articles
  const related = await prisma.editorialArticle.findMany({
    where: { status: "PUBLISHED", type: article.type, id: { not: article.id } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: { author: true },
  });

  const comments = await prisma.comment.findMany({
    where: { articleId: article.id, parentId: null },
    include: {
      author: { include: { designerProfile: true } },
      replies: { include: { author: { include: { designerProfile: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const Icon = TYPE_ICONS[article.type] ?? BookOpen;

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/editorial" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to editorial
        </Link>

        {/* Article header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={TYPE_VARIANTS[article.type] ?? "secondary"}>
              {TYPE_LABELS[article.type] ?? article.type}
            </Badge>
            {article.readTimeMin && (
              <span className="text-sm text-muted-foreground">{article.readTimeMin} min read</span>
            )}
          </div>
          <h1 className="text-3xl font-semibold leading-tight">{article.title}</h1>
          {article.excerpt && (
            <p className="text-lg text-muted-foreground mt-3 leading-relaxed">{article.excerpt}</p>
          )}
          <div className="flex items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium">
                {article.author.name?.[0]?.toUpperCase() ?? "G"}
              </div>
              <div>
                <span className="font-medium text-foreground">{article.author.name ?? "GoBig Editorial"}</span>
                {article.publishedAt && (
                  <span> · {new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                )}
              </div>
            </div>
            <ShareButton url={`/editorial/${article.slug}`} title={article.title} description={article.excerpt ?? undefined} />
          </div>
        </div>

        {/* Cover */}
        <div className="aspect-[16/7] rounded-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center mb-8">
          <Icon className="h-16 w-16 text-muted-foreground/30" />
        </div>

        {/* Content */}
        <article className="prose prose-sm max-w-none text-foreground">
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {article.content}
          </div>
        </article>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-8 pt-6 border-t">
            {article.tags.map(tag => (
              <span key={tag} className="rounded-full border px-3 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Comments */}
        <div className="mt-10 pt-8 border-t">
          <CommentSection
            targetType="EDITORIAL"
            targetId={article.id}
            comments={comments as any}
            currentUserId={session?.user?.id}
            heading="Discussion"
            emptyText="No comments yet. Share your thoughts on this piece."
          />
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="font-semibold mb-4">More {TYPE_LABELS[article.type]?.toLowerCase() ?? "articles"}</h2>
            <div className="flex flex-col gap-3">
              {related.map(r => (
                <Link key={r.id} href={`/editorial/${r.slug}`} className="flex gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                  <div className="h-12 w-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium line-clamp-2">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.author.name} · {r.publishedAt ? timeAgo(r.publishedAt) : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
