"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { ChevronLeft, X } from "lucide-react";

export default function NewJobPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", employmentType: "FULL_TIME",
    location: "", isRemote: false, salaryMin: "", salaryMax: "",
    salaryCurrency: "INR", experience: "", skills: [] as string[],
  });

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      set("skills", [...form.skills, s]);
      setSkillInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      success("Job posted!");
      router.push(`/jobs/${d.job.slug}`);
    } else {
      const d = await res.json();
      error(d.error ?? "Failed to post job");
    }
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to jobs
        </Link>
        <h1 className="text-2xl font-semibold mb-6">Post a design job</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormGroup>
            <Label>Job title *</Label>
            <Input placeholder="e.g. Senior Product Designer" value={form.title} onChange={e => set("title", e.target.value)} required />
          </FormGroup>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>Employment type</Label>
              <Select value={form.employmentType} onChange={e => set("employmentType", e.target.value)}>
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="FREELANCE">Freelance</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="CONTRACT">Contract</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Experience required</Label>
              <Input placeholder="e.g. 3–5 years" value={form.experience} onChange={e => set("experience", e.target.value)} />
            </FormGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>Location</Label>
              <Input placeholder="Bangalore, India" value={form.location} onChange={e => set("location", e.target.value)} />
            </FormGroup>
            <FormGroup>
              <Label className="flex items-center gap-2 mt-6 cursor-pointer">
                <input type="checkbox" checked={form.isRemote} onChange={e => set("isRemote", e.target.checked)} className="rounded" />
                Remote / hybrid allowed
              </Label>
            </FormGroup>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormGroup>
              <Label>Currency</Label>
              <Select value={form.salaryCurrency} onChange={e => set("salaryCurrency", e.target.value)}>
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Salary min</Label>
              <Input type="number" placeholder="600000" value={form.salaryMin} onChange={e => set("salaryMin", e.target.value)} />
            </FormGroup>
            <FormGroup>
              <Label>Salary max</Label>
              <Input type="number" placeholder="1000000" value={form.salaryMax} onChange={e => set("salaryMax", e.target.value)} />
            </FormGroup>
          </div>
          <FormGroup>
            <Label>Job description *</Label>
            <textarea className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical" placeholder="Describe the role, responsibilities, team, and what a great candidate looks like…" value={form.description} onChange={e => set("description", e.target.value)} required />
          </FormGroup>
          <FormGroup>
            <Label>Required skills</Label>
            <div className="flex gap-2">
              <Input placeholder="e.g. Figma" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); }}} />
              <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.skills.map(s => (
                  <span key={s} className="flex items-center gap-1 rounded-full border bg-secondary px-3 py-0.5 text-xs">
                    {s}
                    <button type="button" onClick={() => set("skills", form.skills.filter(x => x !== s))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FormGroup>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Publish job</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </>
  );
}
