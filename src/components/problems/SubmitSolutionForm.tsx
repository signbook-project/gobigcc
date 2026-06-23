"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { Upload, X } from "lucide-react";

export function SubmitSolutionForm({ problemId }: { problemId: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ proposal: "", notes: "", videoUrl: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.proposal.trim()) { error("Proposal is required"); return; }
    setLoading(true);
    const res = await fetch("/api/problems/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, ...form }),
    });
    setLoading(false);
    if (res.ok) {
      success("Solution submitted!", "The company will review your submission.");
      router.refresh();
    } else {
      const d = await res.json();
      error(d.error ?? "Submission failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGroup>
        <Label htmlFor="proposal">Your proposal *</Label>
        <textarea
          id="proposal"
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
          placeholder="Describe your solution approach, materials, process, and why it fits the brief…"
          value={form.proposal}
          onChange={e => setForm({ ...form, proposal: e.target.value })}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="notes">Additional notes (optional)</Label>
        <textarea
          id="notes"
          className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
          placeholder="Timeline, collaboration needs, questions for the company…"
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
        />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="videoUrl">Video walkthrough URL (optional)</Label>
        <Input
          id="videoUrl"
          placeholder="https://youtube.com/..."
          value={form.videoUrl}
          onChange={e => setForm({ ...form, videoUrl: e.target.value })}
        />
      </FormGroup>
      <Button type="submit" loading={loading} className="w-full">
        Submit solution
      </Button>
    </form>
  );
}
