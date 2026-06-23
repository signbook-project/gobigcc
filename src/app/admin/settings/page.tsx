"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import {
  Mail, Database, Cloud, CreditCard, Lock,
  Bell, Settings, UserCog, Shield, Scale, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Section = {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
};

const SECTIONS: Section[] = [
  { key: "email", label: "Email", icon: Mail, description: "SMTP / Resend configuration for transactional emails" },
  { key: "database", label: "Database", icon: Database, description: "PostgreSQL connection settings" },
  { key: "storage", label: "Storage", icon: Cloud, description: "Supabase / S3 file storage buckets" },
  { key: "payments", label: "Payments", icon: CreditCard, description: "Razorpay keys and payout settings" },
  { key: "auth", label: "Auth & Security", icon: Lock, description: "OAuth providers, session, password policy" },
  { key: "notifications", label: "Notifications", icon: Bell, description: "Email triggers and notification rules" },
  { key: "platform", label: "Platform", icon: Settings, description: "Site name, feature flags, limits" },
  { key: "admin_accounts", label: "Admin Accounts", icon: UserCog, description: "Manage admin users and permissions" },
  { key: "moderation", label: "Moderation Rules", icon: Shield, description: "Auto-moderation thresholds and rules" },
  { key: "legal", label: "Legal / Compliance", icon: Scale, description: "Terms, privacy policy, DMCA contact" },
];

function EmailSettings() {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    smtp_host: "smtp.mailgun.org", smtp_port: "587", smtp_encryption: "TLS",
    smtp_user: "postmaster@gobig.cc", smtp_pass: "",
    from_address: "noreply@gobig.cc", from_name: "GoBig.cc",
    test_to: "",
  });

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "email", settings: form }),
    });
    setSaving(false);
    if (res.ok) success("Email settings saved");
    else error("Failed to save settings");
  }

  async function sendTest() {
    if (!form.test_to) return;
    const res = await fetch("/api/admin/settings/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: form.test_to }),
    });
    if (res.ok) success("Test email sent", `Check ${form.test_to}`);
    else error("Failed to send test email");
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label>SMTP host</Label>
          <Input value={form.smtp_host} onChange={e => setForm({...form, smtp_host: e.target.value})} />
        </FormGroup>
        <FormGroup>
          <Label>Port</Label>
          <Input value={form.smtp_port} onChange={e => setForm({...form, smtp_port: e.target.value})} />
        </FormGroup>
      </div>
      <FormGroup>
        <Label>Encryption</Label>
        <Select value={form.smtp_encryption} onChange={e => setForm({...form, smtp_encryption: e.target.value})}>
          <option>TLS</option><option>SSL</option><option>None</option>
        </Select>
      </FormGroup>
      <FormGroup>
        <Label>SMTP username</Label>
        <Input value={form.smtp_user} onChange={e => setForm({...form, smtp_user: e.target.value})} />
      </FormGroup>
      <FormGroup>
        <Label>SMTP password</Label>
        <Input type="password" placeholder="••••••••" value={form.smtp_pass} onChange={e => setForm({...form, smtp_pass: e.target.value})} />
      </FormGroup>
      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label>From address</Label>
          <Input value={form.from_address} onChange={e => setForm({...form, from_address: e.target.value})} />
        </FormGroup>
        <FormGroup>
          <Label>From name</Label>
          <Input value={form.from_name} onChange={e => setForm({...form, from_name: e.target.value})} />
        </FormGroup>
      </div>
      <hr />
      <div>
        <p className="text-sm font-medium mb-3">Send test email</p>
        <div className="flex gap-2">
          <Input placeholder="test@example.com" value={form.test_to} onChange={e => setForm({...form, test_to: e.target.value})} />
          <Button variant="outline" onClick={sendTest}>Send test</Button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline">Discard</Button>
        <Button onClick={save} loading={saving}>Save settings</Button>
      </div>
    </div>
  );
}

function DatabaseSettings() {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    database_url: "", database_url_unpooled: "", pool_size: "10",
  });

  return (
    <div className="space-y-4 max-w-lg">
      <FormGroup>
        <Label>DATABASE_URL (pooled)</Label>
        <Input type="password" placeholder="postgresql://..." value={form.database_url} onChange={e => setForm({...form, database_url: e.target.value})} />
        <p className="text-xs text-muted-foreground mt-1">Used for all queries. Supabase Transaction mode recommended.</p>
      </FormGroup>
      <FormGroup>
        <Label>DATABASE_URL_UNPOOLED (direct)</Label>
        <Input type="password" placeholder="postgresql://..." value={form.database_url_unpooled} onChange={e => setForm({...form, database_url_unpooled: e.target.value})} />
        <p className="text-xs text-muted-foreground mt-1">Used for migrations (Prisma migrate/push).</p>
      </FormGroup>
      <FormGroup>
        <Label>Connection pool size</Label>
        <Input type="number" value={form.pool_size} onChange={e => setForm({...form, pool_size: e.target.value})} />
      </FormGroup>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline">Discard</Button>
        <Button loading={saving} onClick={() => setSaving(true)}>Save settings</Button>
      </div>
    </div>
  );
}

function StorageSettings() {
  return (
    <div className="space-y-4 max-w-lg">
      {[
        { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", placeholder: "https://xxx.supabase.co" },
        { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key", placeholder: "eyJ..." },
        { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role key (secret)", placeholder: "eyJ..." },
        { key: "STORAGE_BUCKET_DESIGNS", label: "Designs bucket name", placeholder: "design-files" },
        { key: "STORAGE_BUCKET_AVATARS", label: "Avatars bucket name", placeholder: "avatars" },
      ].map((f) => (
        <FormGroup key={f.key}>
          <Label>{f.label}</Label>
          <Input placeholder={f.placeholder} type={f.key.includes("KEY") ? "password" : "text"} />
        </FormGroup>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button>Save settings</Button>
      </div>
    </div>
  );
}

function PaymentSettings() {
  return (
    <div className="space-y-4 max-w-lg">
      {[
        { label: "Razorpay Key ID", placeholder: "rzp_live_..." },
        { label: "Razorpay Key Secret (hidden)", placeholder: "••••••••", secret: true },
        { label: "Platform fee %", placeholder: "10" },
        { label: "Escrow release days", placeholder: "14" },
      ].map((f) => (
        <FormGroup key={f.label}>
          <Label>{f.label}</Label>
          <Input type={f.secret ? "password" : "text"} placeholder={f.placeholder} />
        </FormGroup>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button>Save settings</Button>
      </div>
    </div>
  );
}

function PlatformSettings() {
  return (
    <div className="space-y-4 max-w-lg">
      {[
        { label: "Platform name", value: "GoBig.cc" },
        { label: "App URL", value: "https://gobig.cc" },
        { label: "Max file upload size (MB)", value: "200" },
        { label: "Designs per page", value: "24" },
        { label: "Min Creative Score for featured", value: "500" },
      ].map((f) => (
        <FormGroup key={f.label}>
          <Label>{f.label}</Label>
          <Input defaultValue={f.value} />
        </FormGroup>
      ))}
      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium">Feature flags</p>
        {["Enable registrations", "Enable anonymous publishing", "Enable payments", "Enable editorial"].map((flag) => (
          <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" /> {flag}
          </label>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <Button>Save settings</Button>
      </div>
    </div>
  );
}

function PlaceholderSection({ section }: { section: Section }) {
  return (
    <div className="text-sm text-muted-foreground border rounded-lg p-6">
      <p className="font-medium text-foreground mb-1">{section.label}</p>
      <p>{section.description}</p>
      <p className="mt-4 text-xs">Settings UI for this section coming soon. Values are managed via environment variables and the PlatformSetting table.</p>
    </div>
  );
}

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
  email: EmailSettings,
  database: DatabaseSettings,
  storage: StorageSettings,
  payments: PaymentSettings,
  platform: PlatformSettings,
};

export default function AdminSettingsPage() {
  const [active, setActive] = useState("email");
  const activeSection = SECTIONS.find(s => s.key === active)!;
  const SectionComponent = SECTION_COMPONENTS[active] ?? (() => <PlaceholderSection section={activeSection} />);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform configuration — all settings in one place</p>
      </div>

      <div className="flex gap-6 min-h-[60vh]">
        {/* Settings sidebar */}
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left transition-colors w-full",
                  active === s.key
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <s.icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <h2 className="text-base font-semibold">{activeSection.label}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{activeSection.description}</p>
          </div>
          <SectionComponent />
        </div>
      </div>
    </div>
  );
}
