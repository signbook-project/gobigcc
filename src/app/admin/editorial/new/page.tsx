"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { Badge } from "@/components/ui/Card";
import { ChevronLeft, Eye, Save, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ARTICLE_TYPES = [
  { value: "ARTICLE", label: "Article" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "TREND_REPORT", label: "Trend Report" },
  { value: "FEATURED_PROJECT", label: "Featured Project" },
  { value: "NEWSLETTER", label: "Newsletter" },
];

// Very lightweight markdown preview — bold, italic, headings, links
function MarkdownPreview({ content }: { content: string }) {
  const html = content
    .split("\n")
    .map(line => {
      if (line.startsWith("# ")) return `<h1 class="text-2xl font-semibold mt-6 mb-2">${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2 class="text-xl font-semibold mt-5 mb-2">${line.slice(3)}</h2>`;
      if (line.startsWith("### ")) return `<h3 class="text-lg font-semibold mt-4 mb-1">${line.slice(4)}</h3>`;
      if (line.startsWith("- ")) return `<li class="ml-4 list-disc text-sm text-muted-foreground">${line.slice(2)}</li>`;
      if (line.startsWith("> ")) return `<blockquote class="border-l-2 pl-3 italic text-muted-foreground my-2">${line.slice(2)}</blockquote>`;
      if (line === "") return `<br/>`;
      return `<p class="text-sm text-foreground leading-relaxed my-1">${line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, '<code class="bg-secondary px-1 rounded text-xs font-mono">$1</code>')
      }</p>`;
    })
    .join("");
  return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ArticleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { success, error } = useToast();
  const isEdit = !!params?.id;

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    type: "ARTICLE",
    status: "DRAFT",
    excerpt: "",
    content: "",
    tags: [] as string[],
    readTimeMin: "",
  });

  // Load existing article for edit
  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/editorial/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const a = d.article;
          setForm({
            title: a.title, type: a.type, status: a.status,
            excerpt: a.excerpt ?? "", content: a.content,
            tags: a.tags, readTimeMin: a.readTimeMin?.toString() ?? "",
          });
        }
      });
  }, [isEdit, params?.id]);

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) { set("tags", [...form.tags, t]); setTagInput(""); }
  }

  // Auto estimate read time
  function estimateReadTime() {
    const words = form.content.trim().split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 200));
    set("readTimeMin", mins.toString());
  }

  async function save(statusOverride?: string) {
    const isPublish = statusOverride === "PUBLISHED";
    if (isPublish) setPublishing(true); else setSaving(true);

    const payload = {
      ...form,
      status: statusOverride ?? form.status,
      readTimeMin: form.readTimeMin ? Number(form.readTimeMin) : undefined,
    };

    const url = isEdit ? `/api/admin/editorial/${params.id}` : "/api/admin/editorial";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (isPublish) setPublishing(false); else setSaving(false);

    if (res.ok) {
      success(isPublish ? "Article published!" : "Article saved");
      if (!isEdit) {
        const d = await res.json();
        router.push(`/admin/editorial/${d.article.id}`);
      }
    } else {
      const d = await res.json();
      error(d.error ?? "Failed to save");
    }
  }

  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/editorial" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to editorial
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{wordCount} words</span>
          <button
            onClick={() => setPreview(v => !v)}
            className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
              preview ? "bg-secondary" : "hover:bg-secondary")}
          >
            <Eye className="h-3.5 w-3.5" /> {preview ? "Edit" : "Preview"}
          </button>
          <Button variant="outline" size="sm" onClick={() => save()} loading={saving}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </Button>
          {form.status !== "PUBLISHED" && (
            <Button size="sm" onClick={() => save("PUBLISHED")} loading={publishing}>
              <Send className="h-3.5 w-3.5" /> Publish
            </Button>
          )}
          {form.status === "PUBLISHED" && (
            <Badge variant="success" className="px-3">Published</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Editor */}
        <div className="lg:col-span-3 space-y-4">
          <FormGroup>
            <Input
              className="text-xl font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50 h-auto py-2"
              placeholder="Article title…"
              value={form.title}
              onChange={e => set("title", e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <textarea
              className="w-full rounded-md border bg-secondary/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={2}
              placeholder="Short excerpt / summary shown in listings (max 500 chars)…"
              value={form.excerpt}
              maxLength={500}
              onChange={e => set("excerpt", e.target.value)}
            />
          </FormGroup>

          {/* Content area */}
          <div className="rounded-lg border overflow-hidden">
            {/* Toolbar */}
            {!preview && (
              <div className="flex items-center gap-1 px-3 py-2 border-b bg-secondary/30">
                {[
                  { label: "H1", insert: "# " },
                  { label: "H2", insert: "## " },
                  { label: "H3", insert: "### " },
                  { label: "B", insert: "**bold**" },
                  { label: "I", insert: "*italic*" },
                  { label: "—", insert: "\n---\n" },
                  { label: "• list", insert: "\n- " },
                  { label: "> quote", insert: "\n> " },
                  { label: "`code`", insert: "`code`" },
                ].map(tb => (
                  <button key={tb.label} type="button"
                    onClick={() => set("content", form.content + tb.insert)}
                    className="px-2 py-0.5 text-xs rounded hover:bg-secondary font-mono text-muted-foreground hover:text-foreground transition-colors">
                    {tb.label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">Markdown supported</span>
              </div>
            )}

            {preview ? (
              <div className="p-5 min-h-[400px]">
                <MarkdownPreview content={form.content} />
              </div>
            ) : (
              <textarea
                className="w-full min-h-[400px] px-4 py-4 text-sm bg-background font-mono focus:outline-none resize-none leading-relaxed"
                placeholder={`Start writing your ${form.type.replace(/_/g, " ").toLowerCase()}…\n\nUse Markdown:\n# Heading 1\n## Heading 2\n**bold** *italic*\n> blockquote\n- bullet list`}
                value={form.content}
                onChange={e => set("content", e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-medium">Article settings</h3>

            <FormGroup>
              <Label>Type</Label>
              <Select value={form.type} onChange={e => set("type", e.target.value)}>
                {ARTICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Status</Label>
              <Select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <div className="flex items-center justify-between">
                <Label>Read time (min)</Label>
                <button type="button" onClick={estimateReadTime}
                  className="text-xs text-muted-foreground hover:text-foreground underline">Auto</button>
              </div>
              <Input type="number" min="1" max="60" placeholder="5"
                value={form.readTimeMin} onChange={e => set("readTimeMin", e.target.value)} />
            </FormGroup>
          </div>

          {/* Tags */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-medium">Tags</h3>
            <div className="flex gap-1.5">
              <Input
                placeholder="Add tag…" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}}
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs">
                    {t}
                    <button type="button" onClick={() => set("tags", form.tags.filter(x => x !== t))}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Live preview link */}
          {isEdit && form.status === "PUBLISHED" && (
            <Link href={`/editorial`} target="_blank"
              className="flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors">
              <Eye className="h-3.5 w-3.5" /> View on site ↗
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
