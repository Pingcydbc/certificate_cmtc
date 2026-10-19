import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกไฟล์รูปภาพ' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'รองรับเฉพาะไฟล์รูปภาพ JPG หรือ PNG เท่านั้น' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || '.jpg';
    const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${Date.now()}_${cleanBase}${ext}`;

    // 1. If Vercel Blob is configured (Vercel Storage)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`uploads/${filename}`, buffer, {
          access: 'public',
          contentType: file.type,
        });
        return NextResponse.json({
          success: true,
          url: blob.url,
          filename,
        });
      } catch (blobError) {
        console.warn('Vercel Blob upload error, attempting local fallback:', blobError);
      }
    }

    // 2. If running on Vercel / serverless without Blob Token, use Base64 Data URL
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;
      return NextResponse.json({
        success: true,
        url: base64Data,
        filename,
      });
    }

    // 3. Local filesystem storage (Local dev or Docker server)
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
      });
    } catch (fsErr: any) {
      // If filesystem is read-only (EROFS), fall back to Base64
      if (fsErr.code === 'EROFS' || fsErr.message?.includes('read-only')) {
        const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;
        return NextResponse.json({
          success: true,
          url: base64Data,
          filename,
        });
      }
      throw fsErr;
    }
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
