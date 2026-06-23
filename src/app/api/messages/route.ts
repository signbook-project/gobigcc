import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contactId = new URL(req.url).searchParams.get("contactId");
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, recipientId: contactId },
        { senderId: contactId, recipientId: session.user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Mark as read
  await prisma.message.updateMany({
    where: { senderId: contactId, recipientId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true, messages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId, content } = await req.json();
  if (!recipientId || !content?.trim())
    return NextResponse.json({ error: "recipientId and content required" }, { status: 400 });

  if (recipientId === session.user.id)
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const message = await prisma.message.create({
    data: { senderId: session.user.id, recipientId, content: content.trim() },
  });

  return NextResponse.json({ success: true, message }, { status: 201 });
}
