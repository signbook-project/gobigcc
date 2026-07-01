import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/designs/files/[fileId]/download
// Proxies the file from storage with Content-Disposition: attachment,
// and increments the design's downloadCount.
export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  const file = await prisma.designFile.findUnique({ where: { id: params.fileId } });
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Fetch the actual file bytes from storage
  const upstream = await fetch(file.fileUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch file from storage" }, { status: 502 });
  }

  // Fire-and-forget: increment download count on the parent design
  prisma.design
    .update({ where: { id: file.designId }, data: { downloadCount: { increment: 1 } } })
    .catch((err) => console.error("[download] failed to increment count:", err));

  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.fileType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
