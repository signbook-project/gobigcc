import { Navbar } from "@/components/layout/Navbar";
import { prisma } from "@/lib/prisma";
import { DesignCard } from "@/components/design/DesignCard";
import Link from "next/link";
import { DESIGN_CATEGORIES, LICENSE_TYPES } from "@/lib/utils";
import type { DesignCard as DesignCardType } from "@/types";

const PER_PAGE = 24;

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: { category?: string; license?: string; sort?: string; q?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const where: any = { visibility: "PUBLIC" };
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.license) where.licenseType = searchParams.license;
  if (searchParams.q) where.OR = [
    { title: { contains: searchParams.q, mode: "insensitive" } },
    { tags: { has: searchParams.q } },
  ];

  const orderBy: any =
    searchParams.sort === "newest" ? { createdAt: "desc" }
    : searchParams.sort === "most_forked" ? { forkCount: "desc" }
    : searchParams.sort === "most_liked" ? { likeCount: "desc" }
    : { likeCount: "desc" }; // default: trending

  const [designs, total] = await Promise.all([
    prisma.design.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        author: { include: { designerProfile: true } },
        files: { take: 1, orderBy: { sortOrder: "asc" } },
        _count: { select: { likes: true, saves: true, comments: true } },
      },
    }),
    prisma.design.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-52"
            placeholder="Search designs…"
            defaultValue={searchParams.q}
            name="q"
          />
          <div className="flex gap-1.5 flex-wrap">
            <FilterLink href="/designs" label="All" active={!searchParams.category} />
            {DESIGN_CATEGORIES.map((c) => (
              <FilterLink
                key={c.value}
                href={`/designs?category=${c.value}`}
                label={c.label}
                active={searchParams.category === c.value}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue={searchParams.license ?? ""}
            >
              <option value="">License: All</option>
              {LICENSE_TYPES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue={searchParams.sort ?? ""}
            >
              <option value="">Sort: Trending</option>
              <option value="newest">Newest</option>
              <option value="most_forked">Most forked</option>
              <option value="most_liked">Most liked</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <p className="text-sm text-muted-foreground mb-4">{total.toLocaleString()} designs</p>

        {designs.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">No designs found</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {designs.map((d) => (
              <DesignCard key={d.id} design={d as unknown as DesignCardType} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/designs?page=${p}`}
                className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${
                  p === page ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"
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

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
