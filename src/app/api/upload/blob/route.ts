import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getRequestSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    blobEnabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    isServerless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'Vercel Blob is not configured' },
      { status: 501 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = getRequestSession(request);
        if (!session) {
          throw new Error('กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ');
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Client receives blob.url directly from upload() and saves it on the template
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

