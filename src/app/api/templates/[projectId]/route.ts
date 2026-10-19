import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
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
    const body = await request.json();
    const { backgroundImage, width, height, elements } = body;

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: 'ไม่พบโครงการ' }, { status: 404 });
    }

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
          data: elements.map((el: any) => ({
            templateId: template.id,
            elementType: el.elementType || 'dynamic',
            fieldKey: el.fieldKey || 'customText',
            defaultValue: el.defaultValue ?? null,
            posX: Number(el.posX) || 0,
            posY: Number(el.posY) || 0,
            fontSize: Number(el.fontSize) || 24,
            fontFamily: el.fontFamily || 'Sarabun',
            fontColor: el.fontColor || '#000000',
            textAlign: el.textAlign || 'center',
            lineHeight: Number(el.lineHeight) || 1.4,
            maxWidth: el.maxWidth ? Number(el.maxWidth) : null,
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
            isUnderline: Boolean(el.isUnderline),
            letterSpacing: Number(el.letterSpacing) || 0,
            opacity: el.opacity !== undefined && el.opacity !== null ? Number(el.opacity) : 1.0,
            width: el.width !== undefined && el.width !== null ? Number(el.width) : null,
            height: el.height !== undefined && el.height !== null ? Number(el.height) : null,
          })),
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
