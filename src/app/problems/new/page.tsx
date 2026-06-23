"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { ChevronLeft } from "lucide-react";

const CATEGORIES = [
  "PRODUCT_DESIGN","PACKAGING","RETAIL","ARCHITECTURE",
  "MOBILITY","SUSTAINABILITY","UX_UI","MANUFACTURING","BRANDING","OTHER",
];
const REWARD_TYPES = [
  { value: "CASH", label: "Cash prize" },
  { value: "ROYALTY", label: "Royalty / Revenue share" },
  { value: "INTERNSHIP", label: "Internship offer" },
  { value: "CONTRACT", label: "Contract work" },
  { value: "FULL_TIME_OFFER", label: "Full-time job offer" },
  { value: "OTHER", label: "Other" },
];

export default function NewProblemPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", background: "", deliverables: "", constraints: "",
    category: "PRODUCT_DESIGN", rewardType: "CASH", rewardAmount: "",
    rewardDetails: "", deadline: "", submissionVisibility: "PUBLIC",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rewardAmount: form.rewardAmount ? Number(form.rewardAmount) : null }),
    });
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      success("Challenge posted!", "Designers can now submit solutions.");
      router.push(`/problems/${d.problem.slug}`);
    } else {
      const d = await res.json();
      error(d.error ?? "Failed to post challenge");
    }
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/problems" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to challenges
        </Link>
        <h1 className="text-2xl font-semibold mb-6">Post a design challenge</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormGroup>
            <Label>Challenge title *</Label>
            <Input placeholder="e.g. Sustainable retail display for pop-up events" value={form.title} onChange={e => set("title", e.target.value)} required />
          </FormGroup>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>Category</Label>
              <Select value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Submission visibility</Label>
              <Select value={form.submissionVisibility} onChange={e => set("submissionVisibility", e.target.value)}>
                <option value="PUBLIC">Public (visible to all)</option>
                <option value="PRIVATE">Private (only you see them)</option>
              </Select>
            </FormGroup>
          </div>
          <FormGroup>
            <Label>Brief / Description *</Label>
            <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical" placeholder="What problem needs solving? What are you looking for?" value={form.description} onChange={e => set("description", e.target.value)} required />
          </FormGroup>
          <FormGroup>
            <Label>Background / Context</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical" placeholder="Company background, why this challenge exists…" value={form.background} onChange={e => set("background", e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>Deliverables expected</Label>
            <textarea className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical" placeholder="CAD files, renders, spec sheet, prototype…" value={form.deliverables} onChange={e => set("deliverables", e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>Constraints</Label>
            <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical" placeholder="Budget, materials, size limits, accessibility requirements…" value={form.constraints} onChange={e => set("constraints", e.target.value)} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>Reward type</Label>
              <Select value={form.rewardType} onChange={e => set("rewardType", e.target.value)}>
                {REWARD_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </FormGroup>
            {form.rewardType === "CASH" && (
              <FormGroup>
                <Label>Prize amount (₹)</Label>
                <Input type="number" placeholder="5000" value={form.rewardAmount} onChange={e => set("rewardAmount", e.target.value)} />
              </FormGroup>
            )}
          </div>
          <FormGroup>
            <Label>Reward details</Label>
            <Input placeholder="e.g. ₹5,000 + winner's work featured on our site" value={form.rewardDetails} onChange={e => set("rewardDetails", e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>Submission deadline</Label>
            <Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} />
          </FormGroup>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Publish challenge</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </>
  );
}
