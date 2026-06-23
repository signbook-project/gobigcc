import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Admin topbar */}
        <header className="flex items-center justify-between h-14 border-b px-6 bg-background shrink-0">
          <div className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{session.user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5">
              View site ↗
            </a>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
