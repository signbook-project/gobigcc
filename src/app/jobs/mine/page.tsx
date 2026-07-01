import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";
import { ChevronLeft, Users } from "lucide-react";

const STATUS_VARIANTS: Record<string, any> = {
  DRAFT: "secondary", PENDING_REVIEW: "warning", ACTIVE: "success",
  REJECTED: "danger", PAUSED: "warning", CLOSED: "outline",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Awaiting admin approval",
  ACTIVE: "Live",
  REJECTED: "Not approved",
  PAUSED: "Paused",
  CLOSED: "Closed",
  DRAFT: "Draft",
};

export default async function MyJobPostingsPage() {
  const session = await auth();
  if (!session) redirect("/login?redirect=/jobs/mine");

  const jobs = await prisma.job.findMany({
    where: { postedById: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">My job postings</h1>
          <Link href="/jobs/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Post a job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground">
            You haven't posted any jobs yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map(job => (
              <div key={job.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {timeAgo(job.createdAt)}
                      {job.companyNameOverride ? ` · ${job.companyNameOverride}` : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[job.status] ?? "secondary"}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </Badge>
                </div>

                {job.status === "REJECTED" && job.rejectionReason && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">
                    {job.rejectionReason}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3">
                  {job.status === "ACTIVE" && (
                    <Link href={`/jobs/${job.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground border rounded-md px-2.5 py-1">
                      View listing
                    </Link>
                  )}
                  <Link href={`/jobs/applications/${job.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2.5 py-1">
                    <Users className="h-3 w-3" /> {job._count.applications} applications
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
