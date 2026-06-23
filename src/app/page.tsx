import { DesignCard } from "@/components/design/DesignCard";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import type { DesignCard as DesignCardType } from "@/types";
import { ArrowRight, GitFork, Trophy, Zap } from "lucide-react";
import Link from "next/link";

async function getHomepageData() {
  const [
    designCount,
    userCount,
    problemCount,
    trendingDesigns,
    activeProblems,
  ] = await Promise.all([
    prisma.design.count({ where: { visibility: "PUBLIC" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.problem.count({ where: { status: "ACCEPTING_SOLUTIONS" } }),
    prisma.design.findMany({
      where: { visibility: "PUBLIC" },
      orderBy: { likeCount: "desc" },
      take: 6,
      include: {
        author: { include: { designerProfile: true } },
        files: { take: 1 },
        _count: { select: { likes: true, saves: true, comments: true } },
      },
    }),
    prisma.problem.findMany({
      where: { status: "ACCEPTING_SOLUTIONS" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        corporate: { include: { user: true } },
        _count: { select: { submissions: true } },
      },
    }),
  ]);

  return {
    designCount,
    userCount,
    problemCount,
    trendingDesigns,
    activeProblems,
  };
}

export default async function HomePage() {
  const {
    designCount,
    userCount,
    problemCount,
    trendingDesigns,
    activeProblems,
  } = await getHomepageData();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-secondary/40 to-background">
          <div className="mx-auto max-w-7xl px-4 py-20 text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              The open design
              <br />
              network
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
              Publish designs, solve challenges, find talent — where designers
              get discovered and ideas become products.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/designs"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                Explore designs <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/problems"
                className="rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-secondary flex items-center gap-2"
              >
                Browse challenges
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 flex justify-center gap-10 flex-wrap">
              {[
                { label: "Designs", value: designCount.toLocaleString() },
                { label: "Designers", value: userCount.toLocaleString() },
                {
                  label: "Open challenges",
                  value: problemCount.toLocaleString(),
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-semibold">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features strip */}
        <section className="border-b">
          <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
            {[
              {
                icon: GitFork,
                title: "Fork & remix designs",
                desc: "Build on others' work with proper attribution and licensing.",
              },
              {
                icon: Trophy,
                title: "Solve design challenges",
                desc: "Companies post real briefs; designers win cash, royalties, and jobs.",
              },
              {
                icon: Zap,
                title: "Get discovered",
                desc: "Your creative score rises with every like, fork, and challenge win.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 px-6 py-6 first:pl-0 last:pr-0"
              >
                <f.icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trending designs */}
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Trending designs</h2>
            <Link
              href="/designs"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {trendingDesigns.map((d: (typeof trendingDesigns)[number]) => (
              <DesignCard key={d.id} design={d as unknown as DesignCardType} />
            ))}
          </div>
        </section>

        {/* Active challenges */}
        <section className="border-t bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Active challenges</h2>
              <Link
                href="/problems"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              {activeProblems.map((p: (typeof activeProblems)[number]) => (
                <Link
                  key={p.id}
                  href={`/problems/${p.slug}`}
                  className="flex items-start gap-4 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {p.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <Badge variant="default">
                        {p.rewardType === "CASH" && p.rewardAmount
                          ? `${formatCurrency(p.rewardAmount)} prize`
                          : p.rewardType}
                      </Badge>
                      {p.deadline && (
                        <span className="text-xs text-muted-foreground">
                          {Math.max(
                            0,
                            Math.ceil(
                              (p.deadline.getTime() - Date.now()) / 86400000,
                            ),
                          )}{" "}
                          days left
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {p._count.submissions} submissions
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        by {p.corporate.companyName}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center">
            <h2 className="text-2xl font-semibold">
              Ready to share your work?
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Join thousands of designers publishing, collaborating, and
              building careers on GoBig.cc.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
