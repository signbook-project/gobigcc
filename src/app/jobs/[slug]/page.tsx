import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { MapPin, Briefcase, Clock, ChevronLeft, Users } from "lucide-react";
import { ApplyJobForm } from "@/components/jobs/ApplyJobForm";

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full time", PART_TIME: "Part time", FREELANCE: "Freelance",
  INTERNSHIP: "Internship", CONTRACT: "Contract",
};
const TYPE_VARIANTS: Record<string, any> = {
  FULL_TIME: "success", PART_TIME: "info", FREELANCE: "warning",
  INTERNSHIP: "secondary", CONTRACT: "outline",
};

export default async function JobDetailPage({ params }: { params: { slug: string } }) {
  const session = await auth();

  const job = await prisma.job.findUnique({
    where: { slug: params.slug },
    include: {
      corporate: { include: { user: true } },
      _count: { select: { applications: true } },
    },
  });
  if (!job || job.status !== "ACTIVE") notFound();

  let alreadyApplied = false;
  if (session?.user) {
    const existing = await prisma.jobApplication.findFirst({
      where: { jobId: job.id, applicantId: session.user.id },
    });
    alreadyApplied = !!existing;
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-secondary border flex items-center justify-center text-lg font-semibold shrink-0">
                {job.corporate.companyName[0]}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold">{job.title}</h1>
                <p className="text-muted-foreground mt-0.5">{job.corporate.companyName}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <Badge variant={TYPE_VARIANTS[job.employmentType] ?? "secondary"}>
                    {TYPE_LABELS[job.employmentType]}
                  </Badge>
                  {(job.location || job.isRemote) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.isRemote ? "Remote" : job.location}
                    </span>
                  )}
                  {(job.salaryMin || job.salaryMax) && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {job.salaryCurrency} {job.salaryMin?.toLocaleString()}
                      {job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {job.publishedAt ? timeAgo(job.publishedAt) : "Recently posted"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {job._count.applications} applicants
                  </span>
                </div>
              </div>
            </div>

            {job.skills.length > 0 && (
              <div>
                <h2 className="font-medium mb-2">Skills required</h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map(s => (
                    <span key={s} className="rounded-full border px-3 py-0.5 text-xs text-muted-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-medium mb-2">Job description</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{job.description}</div>
            </div>

            {job.experience && (
              <div>
                <h2 className="font-medium mb-1">Experience</h2>
                <p className="text-sm text-muted-foreground">{job.experience}</p>
              </div>
            )}

            {/* Apply form */}
            <div className="border rounded-lg p-5">
              <h2 className="font-medium mb-4">
                {alreadyApplied ? "Application submitted" : "Apply for this role"}
              </h2>
              {!session?.user ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">Sign in to apply</p>
                  <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    Sign in
                  </Link>
                </div>
              ) : alreadyApplied ? (
                <p className="text-sm text-muted-foreground">
                  You've already applied for this role. The company will be in touch if shortlisted.
                </p>
              ) : (
                <ApplyJobForm jobId={job.id} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium text-sm">About {job.corporate.companyName}</h3>
              {job.corporate.industry && (
                <div>
                  <p className="text-xs text-muted-foreground">Industry</p>
                  <p className="text-sm">{job.corporate.industry}</p>
                </div>
              )}
              {job.corporate.country && (
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm">{job.corporate.country}</p>
                </div>
              )}
              {job.corporate.website && (
                <a href={job.corporate.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline block">
                  Visit website ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
