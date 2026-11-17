import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageProject, getRequestSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const recipient = await prisma.recipient.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            template: {
              include: {
                elements: true,
              },
            },
          },
        },
      },
    });

    if (!recipient) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลผู้รับเกียรติบัตร' }, { status: 404 });
    }

    return NextResponse.json({ success: true, recipient });
  } catch (error: any) {
    console.error('Error fetching recipient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch recipient' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getRequestSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' },
        { status: 401 }
      );
    }

    const { id } = params;
    const recipient = await prisma.recipient.findUnique({
      where: { id },
      include: {
        project: {
          select: { createdById: true },
        },
      },
    });

    if (!recipient) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายชื่อนี้' }, { status: 404 });
    }

    if (!canManageProject(session, recipient.project.createdById)) {
      return NextResponse.json(
        {
          success: false,
          error: 'คุณไม่มีสิทธิ์ลบรายชื่อในโครงการนี้ (จัดการได้เฉพาะโครงการที่ตนเองเป็นผู้สร้างเท่านั้น)',
        },
        { status: 403 }
      );
    }

    await prisma.recipient.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบรายชื่อสำเร็จ' });
  } catch (error: any) {
    console.error('Error deleting recipient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete recipient' },
      { status: 500 }
    );
  }
}
