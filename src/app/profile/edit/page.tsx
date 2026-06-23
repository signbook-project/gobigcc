"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { X } from "lucide-react";

const SKILL_SUGGESTIONS = [
  "Product Design","UX Design","UI Design","Figma","Sketch","Adobe XD",
  "Illustrator","Photoshop","SolidWorks","AutoCAD","Rhino","3ds Max",
  "Branding","Typography","Motion Design","Architecture","Interior Design",
];

export default function EditProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [form, setForm] = useState({
    name: "", alias: "", bio: "", country: "",
    website: "", experience: "", skills: [] as string[],
    socialTwitter: "", socialLinkedin: "", socialDribbble: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const p = d.profile;
          setForm({
            name: d.user.name ?? "",
            alias: p?.alias ?? "",
            bio: p?.bio ?? "",
            country: p?.country ?? "",
            website: p?.website ?? "",
            experience: p?.experience ?? "",
            skills: p?.skills ?? [],
            socialTwitter: p?.socialLinks?.twitter ?? "",
            socialLinkedin: p?.socialLinks?.linkedin ?? "",
            socialDribbble: p?.socialLinks?.dribbble ?? "",
          });
        }
        setFetching(false);
      });
  }, [status, router]);

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function addSkill(s: string) {
    const trimmed = s.trim();
    if (trimmed && !form.skills.includes(trimmed) && form.skills.length < 15) {
      set("skills", [...form.skills, trimmed]);
      setSkillInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        socialLinks: {
          twitter: form.socialTwitter,
          linkedin: form.socialLinkedin,
          dribbble: form.socialDribbble,
        },
      }),
    });
    setLoading(false);
    if (res.ok) {
      success("Profile updated!");
      router.push(`/profile/${form.alias || session!.user.id}`);
    } else {
      const d = await res.json();
      error(d.error ?? "Failed to update profile");
    }
  }

  if (fetching) return (
    <>
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
        Loading…
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Edit profile</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic */}
          <div className="rounded-lg border p-5 space-y-4">
            <h2 className="font-medium">Basic info</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup>
                <Label>Display name</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Arnav Joshi" />
              </FormGroup>
              <FormGroup>
                <Label>Alias / username</Label>
                <Input value={form.alias} onChange={e => set("alias", e.target.value)} placeholder="UrbanMaker" />
                <p className="text-xs text-muted-foreground mt-1">gobig.cc/profile/{form.alias || "yourname"}</p>
              </FormGroup>
            </div>
            <FormGroup>
              <Label>Bio</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
                placeholder="Tell the community about yourself, your design style, and what you're working on…"
                value={form.bio}
                onChange={e => set("bio", e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{form.bio.length}/500</p>
            </FormGroup>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup>
                <Label>Country</Label>
                <Input value={form.country} onChange={e => set("country", e.target.value)} placeholder="India" />
              </FormGroup>
              <FormGroup>
                <Label>Experience level</Label>
                <Input value={form.experience} onChange={e => set("experience", e.target.value)} placeholder="3–5 years" />
              </FormGroup>
            </div>
            <FormGroup>
              <Label>Website / portfolio</Label>
              <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://yoursite.com" />
            </FormGroup>
          </div>

          {/* Skills */}
          <div className="rounded-lg border p-5 space-y-4">
            <h2 className="font-medium">Skills</h2>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Figma"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); }}}
              />
              <Button type="button" variant="outline" onClick={() => addSkill(skillInput)}>Add</Button>
            </div>
            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter(s => !form.skills.includes(s)).slice(0, 10).map(s => (
                <button
                  key={s} type="button"
                  onClick={() => addSkill(s)}
                  className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.skills.map(s => (
                  <span key={s} className="flex items-center gap-1 rounded-full bg-secondary border px-3 py-0.5 text-sm">
                    {s}
                    <button type="button" onClick={() => set("skills", form.skills.filter(x => x !== s))}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Socials */}
          <div className="rounded-lg border p-5 space-y-4">
            <h2 className="font-medium">Social links</h2>
            <FormGroup>
              <Label>Twitter / X</Label>
              <Input value={form.socialTwitter} onChange={e => set("socialTwitter", e.target.value)} placeholder="https://x.com/username" />
            </FormGroup>
            <FormGroup>
              <Label>LinkedIn</Label>
              <Input value={form.socialLinkedin} onChange={e => set("socialLinkedin", e.target.value)} placeholder="https://linkedin.com/in/username" />
            </FormGroup>
            <FormGroup>
              <Label>Dribbble</Label>
              <Input value={form.socialDribbble} onChange={e => set("socialDribbble", e.target.value)} placeholder="https://dribbble.com/username" />
            </FormGroup>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={loading}>Save changes</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </>
  );
}
