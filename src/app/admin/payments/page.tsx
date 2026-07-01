import { prisma } from "@/lib/prisma";
import { Badge, StatCard } from "@/components/ui/Card";
import { formatCurrency, timeAgo } from "@/lib/utils";
import Link from "next/link";

const PER_PAGE = 20;
const STATUS_VARIANTS: Record<string, any> = {
  PENDING: "warning", ESCROW: "info", COMPLETED: "success", REFUNDED: "secondary", FAILED: "danger",
};
const TYPE_LABELS: Record<string, string> = {
  LICENSE_PURCHASE: "License purchase", CHALLENGE_REWARD: "Challenge reward", SUBSCRIPTION: "Subscription",
};

export default async function AdminPaymentsPage({
  searchParams,
}: { searchParams: { status?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;

  const [payments, total, totals] = await Promise.all([
    prisma.payment.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({ by: ["status"], _sum: { amount: true }, _count: { id: true } }),
  ]);

  // Resolve payer/payee emails separately (no direct relation set up in schema)
  const userIds = Array.from(new Set(payments.flatMap(p => [p.payerId, p.payeeId].filter(Boolean) as string[])));
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, name: true } })
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const completedTotal = totals.find(t => t.status === "COMPLETED")?._sum.amount ?? 0;
  const escrowTotal = totals.find(t => t.status === "ESCROW")?._sum.amount ?? 0;
  const pendingCount = totals.find(t => t.status === "PENDING")?._count.id ?? 0;
  const refundedTotal = totals.find(t => t.status === "REFUNDED")?._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString()} transactions total</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total revenue" value={formatCurrency(completedTotal)} />
        <StatCard label="In escrow" value={formatCurrency(escrowTotal)} />
        <StatCard label="Pending transactions" value={pendingCount} />
        <StatCard label="Refunded" value={formatCurrency(refundedTotal)} />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/payments"
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${!searchParams.status ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
          All
        </Link>
        {["PENDING", "ESCROW", "COMPLETED", "REFUNDED", "FAILED"].map(s => (
          <Link key={s} href={`/admin/payments?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${searchParams.status === s ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"}`}>
            {s}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-xs text-muted-foreground">
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Payer</th>
              <th className="text-left px-4 py-3">Payee</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                <p>No payment transactions yet.</p>
                <p className="text-xs mt-1">Payments will appear here once Razorpay integration is configured in Settings → Payments.</p>
              </td></tr>
            )}
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3 text-xs">{TYPE_LABELS[p.type] ?? p.type}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{userMap.get(p.payerId)?.email ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.payeeId ? userMap.get(p.payeeId)?.email ?? "—" : "—"}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(p.amount, p.currency)}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"}>{p.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(p.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{p.razorpayPaymentId ?? p.razorpayOrderId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / PER_PAGE) }, (_, i) => i + 1).slice(0, 10).map(p => (
            <Link key={p} href={`/admin/payments?page=${p}`}
              className={`h-9 w-9 flex items-center justify-center rounded-md border text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
        Razorpay integration not yet active. Configure keys at{" "}
        <Link href="/admin/settings/payments" className="underline">Settings → Payments</Link> to start
        accepting license purchases and challenge reward payouts.
      </div>
    </div>
  );
}
