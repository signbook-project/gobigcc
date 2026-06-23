"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";

export function ApplyJobForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ portfolioUrl: "", coverNote: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/jobs/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, ...form }),
    });
    setLoading(false);
    if (res.ok) {
      success("Application submitted!", "The company will review your profile.");
      router.refresh();
    } else {
      const d = await res.json();
      error(d.error ?? "Application failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGroup>
        <Label>Portfolio / GoBig.cc profile URL</Label>
        <Input placeholder="https://gobig.cc/profile/yourname" value={form.portfolioUrl} onChange={e => setForm({ ...form, portfolioUrl: e.target.value })} />
      </FormGroup>
      <FormGroup>
        <Label>Cover note (optional)</Label>
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
          placeholder="Why are you a great fit for this role? What excites you about this company?"
          value={form.coverNote}
          onChange={e => setForm({ ...form, coverNote: e.target.value })}
        />
      </FormGroup>
      <Button type="submit" loading={loading} className="w-full">
        Submit application
      </Button>
    </form>
  );
}
