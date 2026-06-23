"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { FormGroup, Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { cn, DESIGN_CATEGORIES, formatBytes, LICENSE_TYPES, MAX_FILE_SIZE } from "@/lib/utils";
import { ChevronLeft, File as FileIcon, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function PublishDesignPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", designNotes: "",
    category: "PRODUCT_DESIGN", tags: [] as string[],
    visibility: "PUBLIC", identityType: "REAL_NAME",
    publishedAlias: "", licenseType: "OPEN_SOURCE",
    figmaLink: "", licenseDetails: {},
  });

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t) && form.tags.length < 10) {
      set("tags", [...form.tags, t]);
      setTagInput("");
    }
  }

  const onDrop = useCallback((accepted: File[]) => {
    const valid = accepted.filter(f => f.size <= MAX_FILE_SIZE);
    if (valid.length < accepted.length) error("Some files exceeded 200 MB limit and were skipped");
    setFiles(prev => [...prev, ...valid].slice(0, 20));
  }, [error]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [], "application/zip": [], "application/octet-stream": [] },
    maxSize: MAX_FILE_SIZE,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { error("Title is required"); return; }
    setLoading(true);

    try {
      // 1. Create design record
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        error(d.error ?? "Failed to create design");
        setLoading(false);
        return;
      }
      const { design } = await res.json();

      // 2. Upload files if any
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach(f => fd.append("files", f));
        fd.append("designId", design.id);
        await fetch("/api/upload", { method: "POST", body: fd });
      }

      success("Design published!", "Your design is now live.");
      router.push(`/designs/${design.slug}`);
    } catch (err) {
      error("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/designs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to designs
        </Link>
        <h1 className="text-2xl font-semibold mb-6">Publish a design</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — content */}
            <div className="lg:col-span-2 space-y-5">
              <FormGroup>
                <Label>Title *</Label>
                <Input placeholder="e.g. Modular seating system v2" value={form.title} onChange={e => set("title", e.target.value)} required />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
                  placeholder="What is this design? What problem does it solve? Who is it for?"
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                />
              </FormGroup>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label>Category</Label>
                  <Select value={form.category} onChange={e => set("category", e.target.value)}>
                    {DESIGN_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. furniture"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.tags.map(t => (
                        <span key={t} className="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs">
                          {t}
                          <button type="button" onClick={() => set("tags", form.tags.filter(x => x !== t))}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </FormGroup>
              </div>

              {/* File upload */}
              <FormGroup>
                <Label>Upload files</Label>
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? "Drop files here…" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, SVG, PDF, PSD, AI, CAD, ZIP — max 200 MB per file
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border bg-secondary/50 px-3 py-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                        <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FormGroup>

              <FormGroup>
                <Label>Figma / external link (optional)</Label>
                <Input placeholder="https://figma.com/file/..." value={form.figmaLink} onChange={e => set("figmaLink", e.target.value)} />
              </FormGroup>

              <FormGroup>
                <Label>Design notes</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
                  placeholder="Construction notes, file structure, credits, instructions…"
                  value={form.designNotes}
                  onChange={e => set("designNotes", e.target.value)}
                />
              </FormGroup>
            </div>

            {/* Right — settings */}
            <div className="space-y-5">
              {/* Visibility */}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Visibility</p>
                {[
                  { value: "PUBLIC", label: "Public", desc: "Visible to everyone" },
                  { value: "UNLISTED", label: "Unlisted", desc: "Only via direct link" },
                  { value: "DRAFT", label: "Draft", desc: "Only you can see" },
                ].map(v => (
                  <label key={v.value} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio" name="visibility" value={v.value}
                      checked={form.visibility === v.value}
                      onChange={() => set("visibility", v.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{v.label}</p>
                      <p className="text-xs text-muted-foreground">{v.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Identity */}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Publish as</p>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="identity" value="REAL_NAME"
                    checked={form.identityType === "REAL_NAME"}
                    onChange={() => set("identityType", "REAL_NAME")} />
                  Real name
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="identity" value="ALIAS"
                    checked={form.identityType === "ALIAS"}
                    onChange={() => set("identityType", "ALIAS")} />
                  Alias / pseudonym
                </label>
                {form.identityType === "ALIAS" && (
                  <Input placeholder="e.g. UrbanMaker" value={form.publishedAlias} onChange={e => set("publishedAlias", e.target.value)} className="text-sm" />
                )}
              </div>

              {/* License */}
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">License</p>
                {LICENSE_TYPES.map(l => (
                  <label key={l.value} className={cn(
                    "flex flex-col gap-0.5 p-2.5 rounded-md border cursor-pointer transition-colors",
                    form.licenseType === l.value ? "border-primary bg-primary/5" : "hover:bg-secondary"
                  )}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="license" value={l.value}
                        checked={form.licenseType === l.value}
                        onChange={() => set("licenseType", l.value)} />
                      <span className="text-sm font-medium">{l.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">{l.desc}</p>
                  </label>
                ))}
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                {form.visibility === "DRAFT" ? "Save draft" : "Publish design"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => { set("visibility", "DRAFT"); }}>
                Save as draft
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
