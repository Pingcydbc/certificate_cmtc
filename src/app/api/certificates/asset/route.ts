import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeProjectAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Same-origin proxy for external template image URLs (e.g. Vercel Blob)
 * so client-side batch PDF rendering can draw them onto <canvas> without CORS tainting.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const url = searchParams.get('url');

    if (!projectId || !url) {
      return NextResponse.json({ success: false, error: 'Missing projectId or url' }, { status: 400 });
    }

    const auth = await authorizeProjectAccess(request, projectId);
    if (auth.error) return auth.error;

    // Verify URL actually belongs to this project's template (prevents SSRF / open proxy)
    const template = await prisma.certificateTemplate.findUnique({
      where: { projectId },
      include: { elements: true },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const allowedUrls = new Set<string>();
    if (template.backgroundImage) allowedUrls.add(template.backgroundImage);
    for (const el of template.elements) {
      if (el.elementType === 'image' && el.defaultValue) {
        if (el.defaultValue.startsWith('{')) {
          try {
            const parsed = JSON.parse(el.defaultValue);
            if (parsed.url) allowedUrls.add(parsed.url);
          } catch (e) {}
        } else {
          allowedUrls.add(el.defaultValue);
        }
      }
    }

    if (!allowedUrls.has(url) || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      return NextResponse.json({ success: false, error: 'Forbidden asset URL' }, { status: 403 });
    }

    const upstream = await fetch(url);
    if (!upstream.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch asset' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error proxying certificate asset:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Asset proxy error' },
      { status: 500 }
    );
  }
}
