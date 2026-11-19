import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeProjectAccess } from '@/lib/auth';
import { mapTemplateElementsForCreate } from '@/lib/templateHelpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const auth = await authorizeProjectAccess(request, projectId);
    if (auth.error) return auth.error;

    const template = await prisma.certificateTemplate.findUnique({
      where: { projectId },
      include: {
        elements: true,
      },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: 'ไม่พบแม่แบบเกียรติบัตร' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const auth = await authorizeProjectAccess(request, projectId);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { backgroundImage, width, height, elements } = body;

    // Upsert template
    const template = await prisma.certificateTemplate.upsert({
      where: { projectId },
      update: {
        ...(backgroundImage && { backgroundImage }),
        ...(width && { width: Number(width) }),
        ...(height && { height: Number(height) }),
      },
      create: {
        projectId,
        backgroundImage: backgroundImage || '/uploads/NSDV01.jpg',
        width: Number(width) || 990,
        height: Number(height) || 698,
      },
    });

    // If elements provided, replace them atomically
    if (Array.isArray(elements)) {
      await prisma.$transaction([
        prisma.templateElement.deleteMany({
          where: { templateId: template.id },
        }),
        prisma.templateElement.createMany({
          data: mapTemplateElementsForCreate(elements, { templateId: template.id }),
        }),
      ]);
    }

    const updatedTemplate = await prisma.certificateTemplate.findUnique({
      where: { id: template.id },
      include: { elements: true },
    });

    return NextResponse.json({ success: true, template: updatedTemplate });
  } catch (error: any) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save template' },
      { status: 500 }
    );
  }
}
