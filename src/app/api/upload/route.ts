import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const designId = formData.get("designId") as string;
  if (!designId) return NextResponse.json({ error: "designId required" }, { status: 400 });

  // Verify ownership
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design || design.authorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const files = formData.getAll("files") as File[];
  if (files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const uploaded: any[] = [];
  let order = 0;

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `designs/${designId}/${Date.now()}-${order}.${ext}`;

    try {
      const publicUrl = await uploadFile(
        process.env.STORAGE_BUCKET_DESIGNS ?? "design-files",
        path,
        buffer,
        file.type
      );

      const record = await prisma.designFile.create({
        data: {
          designId,
          filename: file.name,
          fileUrl: publicUrl,
          fileType: file.type,
          fileSize: file.size,
          sortOrder: order,
        },
      });

      // Set first image as thumbnail
      if (order === 0 && file.type.startsWith("image/")) {
        await prisma.design.update({ where: { id: designId }, data: { thumbnailUrl: publicUrl } });
      }

      uploaded.push(record);
      order++;
    } catch (err) {
      console.error(`[upload] Failed for ${file.name}:`, err);
    }
  }

  return NextResponse.json({ success: true, files: uploaded });
}
