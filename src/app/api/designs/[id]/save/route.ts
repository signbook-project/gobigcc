import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.designSave.findFirst({
    where: { designId: params.id, userId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already saved" }, { status: 409 });

  await prisma.$transaction([
    prisma.designSave.create({ data: { designId: params.id, userId: session.user.id } }),
    prisma.design.update({ where: { id: params.id }, data: { saveCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.designSave.findFirst({
    where: { designId: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not saved" }, { status: 404 });

  await prisma.$transaction([
    prisma.designSave.delete({ where: { id: existing.id } }),
    prisma.design.update({ where: { id: params.id }, data: { saveCount: { decrement: 1 } } }),
  ]);

  return NextResponse.json({ success: true });
}
