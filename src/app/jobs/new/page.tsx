"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { FormGroup, Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { ChevronLeft, Clock, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [isCorporateAccount, setIsCorporateAccount] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    employmentType: "FULL_TIME",
    location: "",
    isRemote: false,
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "INR",
    experience: "",
    skills: [] as string[],
    companyNameOverride: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?redirect=/jobs/new");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setIsCorporateAccount((session?.user as any)?.role === "CORPORATE");
  }, [status, session]);

  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      set("skills", [...form.skills, s]);
      setSkillInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!isCorporateAccount && !form.companyNameOverride.trim()) {
      error("Company name is required");
      return;
    }

    if (!form.title.trim()) {
      error("Job title is required");
      return;
    }

    if (!form.description.trim() || form.description.length < 20) {
      error("Job description must be at least 20 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        }),
      });

      // Handle non-200 response
      if (!res.ok) {
        let errorMessage = "Failed to submit job";

        // Try to parse error response
        try {
          const contentType = res.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const data = await res.json();
            errorMessage = data.error ?? data.message ?? errorMessage;
          } else {
            // API returned non-JSON error (HTML, plain text, etc)
            errorMessage = `Server error: ${res.status} ${res.statusText}`;
          }
        } catch {
          // Failed to parse response body
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }

        error(errorMessage);
        setLoading(false);
        return;
      }

      // Parse successful response
      try {
        const data = await res.json();
        setSubmitted(true);
        success(
          "Job submitted for review",
          "Our team will approve it shortly."
        );
      } catch {
        // Success but no valid JSON body
        setSubmitted(true);
        success(
          "Job submitted for review",
          "Our team will approve it shortly."
        );
      }
    } catch (err) {
      // Network error
      console.error("Network error:", err);
      error(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || isCorporateAccount === null) return null;

  // Confirmation screen after submit
  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <Clock className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Submitted for review</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Thanks! Your job posting is now waiting for admin approval. You'll
            get a notification as soon as it's live — typically within 24 hours.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Link
              href="/jobs"
              className="rounded-md border px-4 py-2 text-sm hover:bg-secondary transition-colors"
            >
              Back to jobs
            </Link>
            <Link
              href="/notifications"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View notifications
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/jobs"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <h1 className="text-2xl font-semibold mb-2">Post a design job</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Anyone can submit a job posting. Our team reviews every listing before
          it goes live to keep the board high quality.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isCorporateAccount && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-medium text-blue-900">Company details</p>
              <p className="text-xs text-blue-800">
                You're posting as an individual. Tell us which company this role
                is for — we'll credit them on the listing.
              </p>
              <FormGroup>
                <Label>Company name *</Label>
                <Input
                  placeholder="e.g. RetailCo"
                  value={form.companyNameOverride}
                  onChange={(e) => set("companyNameOverride", e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Contact email (for applicant forwarding)</Label>
                <Input
                  type="email"
                  placeholder="hiring@company.com"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Defaults to your account email if left blank.
                </p>
              </FormGroup>
            </div>
          )}

          <FormGroup>
            <Label>Job title *</Label>
            <Input
              placeholder="e.g. Senior Product Designer"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>Employment type</Label>
              <Select
                value={form.employmentType}
                onChange={(e) => set("employmentType", e.target.value)}
              >
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="FREELANCE">Freelance</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="CONTRACT">Contract</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Experience required</Label>
              <Input
                placeholder="e.g. 3–5 years"
                value={form.experience}
                onChange={(e) => set("experience", e.target.value)}
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>Location</Label>
              <Input
                placeholder="Bangalore, India"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label className="flex items-center gap-2 mt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRemote}
                  onChange={(e) => set("isRemote", e.target.checked)}
                  className="rounded"
                />
                Remote / hybrid allowed
              </Label>
            </FormGroup>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormGroup>
              <Label>Currency</Label>
              <Select
                value={form.salaryCurrency}
                onChange={(e) => set("salaryCurrency", e.target.value)}
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Salary min</Label>
              <Input
                type="number"
                placeholder="600000"
                value={form.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label>Salary max</Label>
              <Input
                type="number"
                placeholder="1000000"
                value={form.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
              />
            </FormGroup>
          </div>

          <FormGroup>
            <Label>Job description *</Label>
            <textarea
              className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
              placeholder="Describe the role, responsibilities, team, and what a great candidate looks like…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
              minLength={20}
            />
          </FormGroup>

          <FormGroup>
            <Label>Required skills</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Figma"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                Add
              </Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.skills.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 rounded-full border bg-secondary px-3 py-0.5 text-xs"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "skills",
                          form.skills.filter((x) => x !== s)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FormGroup>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Submit for review
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}