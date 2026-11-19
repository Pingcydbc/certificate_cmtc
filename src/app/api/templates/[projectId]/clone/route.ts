import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeProjectAccess } from '@/lib/auth';
import { mapTemplateElementsForCreate } from '@/lib/templateHelpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const targetAuth = await authorizeProjectAccess(request, projectId);
    if (targetAuth.error) return targetAuth.error;

    const body = await request.json();
    const { sourceProjectId, mode = 'full' } = body;

    if (!sourceProjectId || typeof sourceProjectId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกโครงการต้นฉบับที่ต้องการคัดลอก' },
        { status: 400 }
      );
    }

    if (sourceProjectId === projectId) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถคัดลอกแม่แบบจากโครงการเดียวกันได้' },
        { status: 400 }
      );
    }

    const sourceAuth = await authorizeProjectAccess(request, sourceProjectId);
    if (sourceAuth.error) return sourceAuth.error;

    const sourceTemplate = await prisma.certificateTemplate.findUnique({
      where: { projectId: sourceProjectId },
      include: { elements: true },
    });

    if (!sourceTemplate) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบแม่แบบเกียรติบัตรของโครงการต้นฉบับ' },
        { status: 404 }
      );
    }

    const copyFull = mode === 'full';

    const targetTemplate = await prisma.certificateTemplate.upsert({
      where: { projectId },
      update: copyFull
        ? {
            backgroundImage: sourceTemplate.backgroundImage,
            width: sourceTemplate.width,
            height: sourceTemplate.height,
          }
        : {},
      create: {
        projectId,
        backgroundImage: sourceTemplate.backgroundImage || '/uploads/NSDV01.jpg',
        width: sourceTemplate.width || 990,
        height: sourceTemplate.height || 698,
      },
    });

    await prisma.$transaction([
      prisma.templateElement.deleteMany({
        where: { templateId: targetTemplate.id },
      }),
      ...(sourceTemplate.elements.length > 0
        ? [
            prisma.templateElement.createMany({
              data: mapTemplateElementsForCreate(sourceTemplate.elements, {
                templateId: targetTemplate.id,
              }),
            }),
          ]
        : []),
    ]);

    const updatedTemplate = await prisma.certificateTemplate.findUnique({
      where: { id: targetTemplate.id },
      include: { elements: true },
    });

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: copyFull
        ? `คัดลอกแม่แบบและองค์ประกอบ ${sourceTemplate.elements.length} รายการเรียบร้อยแล้ว`
        : `คัดลอกการจัดวางองค์ประกอบ ${sourceTemplate.elements.length} รายการเรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Error cloning template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการคัดลอกแม่แบบ' },
      { status: 500 }
    );
  }
}
