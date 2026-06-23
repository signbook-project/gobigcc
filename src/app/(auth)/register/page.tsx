"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormGroup, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";

export default function RegisterPage() {
  const router = useRouter();
  const { error, success } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", role: "DESIGNER",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      error("Passwords don't match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      error(data.error ?? "Registration failed");
    } else {
      success("Account created! Please sign in.");
      router.push("/login");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-semibold">GoBig.cc</Link>
          <p className="mt-2 text-sm text-muted-foreground">Create your free account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGroup>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Arnav Joshi" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="role">I am joining as</Label>
            <Select id="role" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="DESIGNER">Designer</option>
              <option value="CORPORATE">Company / Recruiter</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required />
          </FormGroup>
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
