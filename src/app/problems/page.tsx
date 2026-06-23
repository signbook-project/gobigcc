import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Card";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { ArrowRight, Trophy, Clock, Users } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "PRODUCT_DESIGN", label: "Product Design" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "RETAIL", label: "Retail" },
  { value: "ARCHITECTURE", label: "Architecture" },
  { value: "MOBILITY", label: "Mobility" },
  { value: "SUSTAINABILITY", label: "Sustainability" },
  { value: "UX_UI", label: "UX / UI" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "BRANDING", label: "Branding" },
];

const STATUS_LABELS: Record<string, string> = {
  ACCEPTING_SOLUTIONS: "Open",
  REVIEWING: "Under review",
  WINNER_SELECTED: "Winner selected",
  CLOSED: "Closed",
};
const STATUS_VARIANTS: Record<string, any> = {
  ACCEPTING_SOLUTIONS: "success",
  REVIEWING: "warning",
  WINNER_SELECTED: "info",
  CLOSED: "secondary",
};
const REWARD_LABELS: Record<string, string> = {
  CASH: "Cash prize",
  ROYALTY: "Royalty",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  FULL_TIME_OFFER: "Full-time offer",
  OTHER: "Other",
};

const PER_PAGE = 12;

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string; q?: string; page?: string };
}) {
  const session = await auth();
  const page = Number(searchParams.page ?? 1);

  const where: any = { status: { in: ["ACCEPTING_SOLUTIONS", "REVIEWING", "WINNER_SELECTED"] } };
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.q)
    where.OR = [
      { title: { contains: searchParams.q, mode: "insensitive" } },
      { description: { contains: searchParams.q, mode: "insensitive" } },
    ];

  const orderBy: any =
    searchParams.sort === "prize" ? { rewardAmount: "desc" }
    : searchParams.sort === "deadline" ? { deadline: "asc" }
    : { createdAt: "desc" };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        corporate: { include: { user: true } },
        _count: { select: { submissions: true } },
      },
    }),
    prisma.problem.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Design Challenges</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Solve real briefs from companies. Win cash, royalties, and job offers.
            </p>
          </div>
          {session?.user && (
            <Link
              href="/problems/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Post a challenge
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-52"
            placeholder="Search challenges…"
            defaultValue={searchParams.q}
          />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={c.value ? `/problems?category=${c.value}` : "/problems"}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  (searchParams.category ?? "") === c.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto">
            <select className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">Sort: Newest</option>
              <option value="prize">Prize: High to low</option>
              <option value="deadline">Deadline: Soonest</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{total.toLocaleString()} challenges</p>

        {/* Cards */}
        {problems.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">No challenges found</div>
        ) : (
          <div className="flex flex-col gap-4">
            {problems.map((p) => {
              const daysLeft = p.deadline
                ? Math.max(0, Math.ceil((p.deadline.getTime() - Date.now()) / 86400_000))
                : null;
              return (
                <Link
                  key={p.id}
                  href={`/problems/${p.slug}`}
                  className="flex gap-4 rounded-lg border bg-card p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <h2 className="font-medium text-base">{p.title}</h2>
                      <Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{p.description}</p>
                    <div className="flex items-center gap-4 mt-3 flex-wrap text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-green-700">
                        <Trophy className="h-3.5 w-3.5" />
                        {p.rewardType === "CASH" && p.rewardAmount
                          ? formatCurrency(p.rewardAmount)
                          : REWARD_LABELS[p.rewardType] ?? p.rewardType}
                      </span>
                      {daysLeft !== null && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {daysLeft > 0 ? `${daysLeft} days left` : "Deadline passed"}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {p._count.submissions} submissions
                      </span>
                      <span className="text-muted-foreground ml-auto">
                        by {p.corporate.companyName}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/problems?page=${p}`}
                className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${
                  p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
