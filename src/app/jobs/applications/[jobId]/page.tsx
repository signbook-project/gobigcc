"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { timeAgo } from "@/lib/utils";
import { ChevronLeft, ExternalLink } from "lucide-react";

const STATUS_OPTIONS = ["APPLIED", "SHORTLISTED", "CONTACTED", "HIRED", "REJECTED"];
const STATUS_VARIANTS: Record<string, any> = {
  APPLIED: "secondary", SHORTLISTED: "info", CONTACTED: "warning", HIRED: "success", REJECTED: "danger",
};

interface Applicant {
  id: string;
  designerProfile: { alias: string | null } | null;
  name: string | null;
  email: string;
}

interface Application {
  id: string;
  status: string;
  portfolioUrl: string | null;
  coverNote: string | null;
  createdAt: string;
  applicant: Applicant;
}

export default function JobApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { success, error } = useToast();
  const [job, setJob] = useState<{ title: string } | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(`/login?redirect=/jobs/applications/${params.jobId}`);
      return;
    }
    if (sessionStatus !== "authenticated") return;
    load();
  }, [sessionStatus]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/jobs/${params.jobId}/applications`);
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    if (res.ok) {
      const d = await res.json();
      setJob(d.job);
      setApplications(d.applications);
    }
    setLoading(false);
  }

  async function updateStatus(applicationId: string, status: string) {
    const res = await fetch(`/api/jobs/${params.jobId}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, status }),
    });
    if (res.ok) {
      setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status } : a));
      success("Applicant notified");
    } else {
      error("Failed to update status");
    }
  }

  if (sessionStatus === "loading" || loading) return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</div>
    </>
  );

  if (forbidden) return (
    <>
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Not your job posting</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Only the person who submitted this job can view its applications.
        </p>
        <Link href="/jobs" className="inline-block mt-6 rounded-md border px-4 py-2 text-sm hover:bg-secondary transition-colors">
          Back to jobs
        </Link>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <h1 className="text-2xl font-semibold">{job?.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{applications.length} application{applications.length !== 1 ? "s" : ""}</p>

        {applications.length === 0 ? (
          <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground mt-6">
            No applications yet. Share your listing to get more reach.
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-6">
            {applications.map(app => {
              const name = app.applicant.designerProfile?.alias ?? app.applicant.name ?? app.applicant.email;
              return (
                <div key={app.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-secondary border flex items-center justify-center text-sm font-medium shrink-0">
                        {name[0].toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/profile/${app.applicant.designerProfile?.alias ?? app.applicant.id}`} className="font-medium text-sm hover:underline">
                          {name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{app.applicant.email} · Applied {timeAgo(app.createdAt)}</p>
                      </div>
                    </div>
                    <select
                      value={app.status}
                      onChange={e => updateStatus(app.id, e.target.value)}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {app.coverNote && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{app.coverNote}</p>
                  )}
                  {app.portfolioUrl && (
                    <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                      View portfolio <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div className="mt-2">
                    <Badge variant={STATUS_VARIANTS[app.status] ?? "secondary"}>{app.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
