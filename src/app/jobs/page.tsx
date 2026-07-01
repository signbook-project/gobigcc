import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import { ArrowRight, Briefcase, Clock, MapPin } from "lucide-react";
import Link from "next/link";

const JOB_TYPES = [
  { value: "", label: "All" },
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONTRACT", label: "Contract" },
];

const TYPE_VARIANTS: Record<string, any> = {
  FULL_TIME: "success", PART_TIME: "info", FREELANCE: "warning",
  INTERNSHIP: "secondary", CONTRACT: "outline",
};
const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full time", PART_TIME: "Part time", FREELANCE: "Freelance",
  INTERNSHIP: "Internship", CONTRACT: "Contract",
};

const PER_PAGE = 15;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { type?: string; q?: string; remote?: string; page?: string };
}) {
  const session = await auth();
  const page = Number(searchParams.page ?? 1);

  const where: any = { status: "ACTIVE" };
  if (searchParams.type) where.employmentType = searchParams.type;
  if (searchParams.remote === "1") where.isRemote = true;
  if (searchParams.q)
    where.OR = [
      { title: { contains: searchParams.q, mode: "insensitive" } },
      { description: { contains: searchParams.q, mode: "insensitive" } },
      { skills: { has: searchParams.q } },
    ];

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        corporate: { include: { user: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Design Jobs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Full-time, freelance, and internship opportunities for designers.
            </p>
          </div>
          {session?.user ? (
            <div className="flex gap-2">
              <Link href="/jobs/mine" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                My postings
              </Link>
              <Link href="/jobs/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Post a job
              </Link>
            </div>
          ) : (
            <Link href="/login?redirect=/jobs/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Post a job
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-52"
            placeholder="Search jobs, skills…"
            defaultValue={searchParams.q}
          />
          <div className="flex gap-1.5 flex-wrap">
            {JOB_TYPES.map((t) => (
              <Link
                key={t.value}
                href={t.value ? `/jobs?type=${t.value}` : "/jobs"}
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
          <Link
            href={searchParams.remote === "1" ? "/jobs" : "/jobs?remote=1"}
            className={`rounded-full border px-3 py-1 text-xs ml-auto transition-colors ${
              searchParams.remote === "1"
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Remote only
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{total.toLocaleString()} jobs</p>

        {/* Job cards */}
        {jobs.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">No jobs found</div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => {
              const companyName = job.corporate?.companyName ?? job.companyNameOverride ?? "Company";
              return (
              <Link
                key={job.id}
                href={`/jobs/${job.slug}`}
                className="flex items-start gap-4 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
              >
                {/* Company logo */}
                <div className="h-11 w-11 rounded-lg bg-secondary border flex items-center justify-center text-sm font-semibold shrink-0">
                  {companyName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{companyName}</p>
                    </div>
                    <Badge variant={TYPE_VARIANTS[job.employmentType] ?? "secondary"}>
                      {TYPE_LABELS[job.employmentType] ?? job.employmentType}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-muted-foreground">
                    {(job.location || job.isRemote) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.isRemote ? "Remote" : job.location}
                      </span>
                    )}
                    {(job.salaryMin || job.salaryMax) && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {job.salaryCurrency} {job.salaryMin?.toLocaleString()}
                        {job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"}
                      </span>
                    )}
                    {job.experience && <span>{job.experience}</span>}
                    {job.skills.slice(0, 3).map(s => (
                      <span key={s} className="rounded bg-secondary px-1.5 py-0.5">{s}</span>
                    ))}
                    <span className="ml-auto flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {job.publishedAt ? timeAgo(job.publishedAt) : "Recently"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </Link>
            );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/jobs?page=${p}`}
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
