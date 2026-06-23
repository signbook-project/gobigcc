import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { MessagingClient } from "@/components/layout/MessagingClient";

export default async function MessagesPage({ searchParams }: { searchParams: { to?: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  // Get all conversation partners
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: session.user.id }, { recipientId: session.user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { include: { designerProfile: true } },
      recipient: { include: { designerProfile: true } },
    },
  });

  // Build unique threads
  const threadsMap = new Map<string, any>();
  for (const msg of messages) {
    const otherId = msg.senderId === session.user.id ? msg.recipientId : msg.senderId;
    const other = msg.senderId === session.user.id ? msg.recipient : msg.sender;
    if (!threadsMap.has(otherId)) {
      threadsMap.set(otherId, { contact: other, lastMessage: msg, unreadCount: 0 });
    }
    if (!msg.isRead && msg.recipientId === session.user.id) {
      threadsMap.get(otherId).unreadCount++;
    }
  }
  const threads = Array.from(threadsMap.values());

  // If ?to= param, load that conversation
  let initialConversation: any[] = [];
  let initialContactId = searchParams.to ?? threads[0]?.contact?.id ?? null;

  if (initialContactId) {
    initialConversation = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, recipientId: initialContactId },
          { senderId: initialContactId, recipientId: session.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    // Mark as read
    await prisma.message.updateMany({
      where: { senderId: initialContactId, recipientId: session.user.id, isRead: false },
      data: { isRead: true },
    });
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Messages</h1>
        <MessagingClient
          currentUserId={session.user.id}
          threads={JSON.parse(JSON.stringify(threads))}
          initialContactId={initialContactId}
          initialConversation={JSON.parse(JSON.stringify(initialConversation))}
        />
      </div>
    </>
  );
}
